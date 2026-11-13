'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const { Pool } = require('pg');
const initSqlJs = require('sql.js/dist/sql-asm.js');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000
});

app.use(express.json({
  limit: '256kb'
}));


/* =========================================================
   AUTHENTICATION
   ========================================================= */

function equal(a, b) {
  if (!a || !b) return false;

  const x = Buffer.from(a);
  const y = Buffer.from(b);

  return (
    x.length === y.length &&
    crypto.timingSafeEqual(x, y)
  );
}

function role(req) {
  const token = req.get('x-token');

  if (equal(token, process.env.ADMIN_TOKEN)) {
    return 'admin';
  }

  if (equal(token, process.env.EDITOR_TOKEN)) {
    return 'editor';
  }

  return null;
}

function auth(req, res, next) {
  if (!role(req)) {
    return res.status(401).json({
      error: 'Please sign in with a valid editor or admin token.'
    });
  }

  next();
}


/* =========================================================
   FACILITY VALIDATION
   ========================================================= */

function validate(body) {
  const name = String(
    body.facility_name || ''
  ).trim();

  const type = String(
    body.facility_type || ''
  ).trim();

  const ownership = String(
    body.ownership || 'Unknown'
  ).trim();

  const address = String(
    body.address || ''
  ).trim();

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (
    !name ||
    name.length > 160 ||
    !type ||
    type.length > 100 ||
    address.length > 250
  ) {
    throw Error(
      'Enter a facility name and type; keep the address under 250 characters.'
    );
  }

  if (
    !['Public', 'Private', 'Military', 'Unknown']
      .includes(ownership)
  ) {
    throw Error('Choose a valid ownership category.');
  }

  if (
    body.latitude === '' ||
    body.longitude === '' ||
    body.latitude == null ||
    body.longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw Error(
      'Enter valid latitude and longitude.'
    );
  }

  return [
    name,
    type,
    ownership,
    address || null,
    longitude,
    latitude
  ];
}


/* =========================================================
   ASYNC ERROR HANDLING
   ========================================================= */

const wrap = fn => (req, res) => {
  Promise.resolve(fn(req, res)).catch(error => {
    console.error(error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'The request failed. Check the server console and database connection.'
      });
    }
  });
};


/* =========================================================
   PUBLIC FACILITY FIELDS
   ========================================================= */

/*
  The notes column is included in public API responses and exports.

  Only store information in notes that is suitable for website
  visitors to download and read.
*/

const fields = `
  id,
  facility_name,
  facility_type,
  ownership,
  address,
  contact_number,
  notes,
  ST_Y(geom) AS latitude,
  ST_X(geom) AS longitude
`;


/* =========================================================
   GEOPACKAGE HELPERS
   ========================================================= */

/*
  sql.js creates an SQLite database in memory.

  A GeoPackage is an SQLite database with required GeoPackage
  metadata tables and GeoPackage geometry blobs.
*/

let sqlPromise;

function getSqlJs() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs().catch(error => {
      // Allow another attempt if initialization fails.
      sqlPromise = null;
      throw error;
    });
  }

  return sqlPromise;
}

function pointGeometry(longitude, latitude) {
  /*
    GeoPackage geometry header:

    Byte 0–1: "GP"
    Byte 2: version 0
    Byte 3: flags, little-endian, no envelope
    Byte 4–7: SRS ID, 4326

    Followed by standard WKB Point:
    Byte 8: little-endian
    Byte 9–12: geometry type 1 = Point
    Byte 13–20: longitude / X
    Byte 21–28: latitude / Y
  */

  const buffer = Buffer.alloc(29);

  buffer.write('GP', 0, 'ascii');

  buffer.writeUInt8(0, 2);
  buffer.writeUInt8(1, 3);

  buffer.writeInt32LE(4326, 4);

  buffer.writeUInt8(1, 8);
  buffer.writeUInt32LE(1, 9);

  buffer.writeDoubleLE(longitude, 13);
  buffer.writeDoubleLE(latitude, 21);

  return new Uint8Array(buffer);
}

async function createGeoPackage(rows) {
  const SQL = await getSqlJs();
  const db = new SQL.Database();

  try {
    /*
      GeoPackage application ID: 0x47504B47 = "GPKG".
      user_version 10300 indicates GeoPackage version 1.3.0.
    */

    db.run('PRAGMA application_id = 1196444487');
    db.run('PRAGMA user_version = 10300');

    db.run(`
      CREATE TABLE gpkg_spatial_ref_sys (
        srs_name TEXT NOT NULL,
        srs_id INTEGER NOT NULL PRIMARY KEY,
        organization TEXT NOT NULL,
        organization_coordsys_id INTEGER NOT NULL,
        definition TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE gpkg_contents (
        table_name TEXT NOT NULL PRIMARY KEY,
        data_type TEXT NOT NULL,
        identifier TEXT UNIQUE,
        description TEXT DEFAULT '',
        last_change DATETIME NOT NULL
          DEFAULT (
            strftime(
              '%Y-%m-%dT%H:%M:%fZ',
              'now'
            )
          ),
        min_x DOUBLE,
        min_y DOUBLE,
        max_x DOUBLE,
        max_y DOUBLE,
        srs_id INTEGER,
        FOREIGN KEY (srs_id)
          REFERENCES gpkg_spatial_ref_sys(srs_id)
      );

      CREATE TABLE gpkg_geometry_columns (
        table_name TEXT NOT NULL,
        column_name TEXT NOT NULL,
        geometry_type_name TEXT NOT NULL,
        srs_id INTEGER NOT NULL,
        z TINYINT NOT NULL,
        m TINYINT NOT NULL,

        PRIMARY KEY (table_name, column_name),

        FOREIGN KEY (table_name)
          REFERENCES gpkg_contents(table_name),

        FOREIGN KEY (srs_id)
          REFERENCES gpkg_spatial_ref_sys(srs_id)
      );

      CREATE TABLE healthcare_facilities (
        fid INTEGER PRIMARY KEY AUTOINCREMENT,
        id INTEGER,
        facility_name TEXT,
        facility_type TEXT,
        ownership TEXT,
        address TEXT,
        contact_number TEXT,
        notes TEXT,
        geom POINT NOT NULL
      );
    `);

    const wgs84 = [
      'GEOGCS["WGS 84",',
      'DATUM["WGS_1984",',
      'SPHEROID["WGS 84",6378137,298.257223563]],',
      'PRIMEM["Greenwich",0],',
      'UNIT["degree",0.0174532925199433],',
      'AUTHORITY["EPSG","4326"]]'
    ].join('');

    const addSrs = db.prepare(`
      INSERT INTO gpkg_spatial_ref_sys (
        srs_name,
        srs_id,
        organization,
        organization_coordsys_id,
        definition,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    addSrs.run([
      'Undefined Cartesian SRS',
      -1,
      'NONE',
      -1,
      'undefined',
      'Undefined Cartesian coordinate reference system'
    ]);

    addSrs.run([
      'Undefined geographic SRS',
      0,
      'NONE',
      0,
      'undefined',
      'Undefined geographic coordinate reference system'
    ]);

    addSrs.run([
      'WGS 84 geodetic',
      4326,
      'EPSG',
      4326,
      wgs84,
      'World Geodetic System 1984'
    ]);

    addSrs.free();

    db.run(`
      INSERT INTO gpkg_contents (
        table_name,
        data_type,
        identifier,
        description,
        srs_id
      )
      VALUES (
        'healthcare_facilities',
        'features',
        'healthcare_facilities',
        'Quetta healthcare facilities',
        4326
      )
    `);

    db.run(`
      INSERT INTO gpkg_geometry_columns (
        table_name,
        column_name,
        geometry_type_name,
        srs_id,
        z,
        m
      )
      VALUES (
        'healthcare_facilities',
        'geom',
        'POINT',
        4326,
        0,
        0
      )
    `);

    const insert = db.prepare(`
      INSERT INTO healthcare_facilities (
        id,
        facility_name,
        facility_type,
        ownership,
        address,
        contact_number,
        notes,
        geom
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      db.run('BEGIN');

      for (const row of rows) {
        if (
          row.latitude == null ||
          row.longitude == null
        ) {
          throw Error(
            `Facility ${row.id} has missing coordinates.`
          );
        }

        const latitude = Number(row.latitude);
        const longitude = Number(row.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          throw Error(
            `Facility ${row.id} has invalid coordinates.`
          );
        }

        insert.run([
          row.id,
          row.facility_name ?? null,
          row.facility_type ?? null,
          row.ownership ?? null,
          row.address ?? null,
          row.contact_number ?? null,
          row.notes ?? null,
          pointGeometry(longitude, latitude)
        ]);
      }

      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    } finally {
      insert.free();
    }

    return Buffer.from(db.export());
  } finally {
    db.close();
  }
}


/* =========================================================
   API: HEALTH AND LOGIN STATUS
   ========================================================= */

app.get(
  '/api/health',
  wrap(async (req, res) => {
    await pool.query('SELECT 1');

    res.json({
      ok: true
    });
  })
);

app.get('/api/me', (req, res) => {
  res.json({
    role: role(req)
  });
});


/* =========================================================
   API: READ FACILITIES
   ========================================================= */

app.get(
  '/api/facilities',
  wrap(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT ${fields}
      FROM public.healthcare_facilities
      ORDER BY facility_name
    `);

    res.json(rows);
  })
);


/* =========================================================
   API: EXPORT GEOPACKAGE
   ========================================================= */

/*
  POST /api/export/geopackage

  Body:

  {
    "ids": [1, 2, 4]
  }

  The frontend sends IDs of currently visible facilities.
  The server retrieves those records from PostgreSQL and creates
  a GeoPackage containing their point geometry and public fields.
*/

app.post(
  '/api/export/geopackage',
  wrap(async (req, res) => {
    const ids = req.body?.ids;

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 10000
    ) {
      return res.status(400).json({
        error: 'Provide between 1 and 10,000 facility IDs.'
      });
    }

    const validIds = ids.every(id =>
      Number.isSafeInteger(id) &&
      id > 0 &&
      id <= 2147483647
    );

    if (!validIds) {
      return res.status(400).json({
        error: 'One or more facility IDs are invalid.'
      });
    }

    const uniqueIds = [...new Set(ids)];

    const { rows } = await pool.query(
      `
        SELECT ${fields}
        FROM public.healthcare_facilities
        WHERE id = ANY($1::integer[])
        ORDER BY facility_name
      `,
      [uniqueIds]
    );

    if (rows.length !== uniqueIds.length) {
      return res.status(409).json({
        error:
          'Some facilities no longer exist. Refresh the website and try again.'
      });
    }

    const geoPackage = await createGeoPackage(rows);

    res.setHeader(
      'Content-Type',
      'application/geopackage+sqlite3'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="quetta_healthcare_facilities.gpkg"'
    );

    res.setHeader(
      'Cache-Control',
      'no-store'
    );

    res.send(geoPackage);
  })
);


/* =========================================================
   API: READ ONE FACILITY
   ========================================================= */

app.get(
  '/api/facilities/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Invalid ID.'
      });
    }

    const { rows } = await pool.query(
      `
        SELECT ${fields}
        FROM public.healthcare_facilities
        WHERE id = $1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Facility not found.'
      });
    }

    res.json(rows[0]);
  })
);


/* =========================================================
   API: ADD FACILITY
   ========================================================= */

app.post(
  '/api/facilities',
  auth,
  wrap(async (req, res) => {
    let values;

    try {
      values = validate(req.body);
    } catch (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    const { rows } = await pool.query(
      `
        INSERT INTO public.healthcare_facilities (
          facility_name,
          facility_type,
          ownership,
          address,
          geom
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          ST_SetSRID(
            ST_MakePoint($5, $6),
            4326
          )
        )
        RETURNING id
      `,
      values
    );

    res.status(201).json(rows[0]);
  })
);


/* =========================================================
   API: UPDATE FACILITY
   ========================================================= */

app.put(
  '/api/facilities/:id',
  auth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Invalid ID.'
      });
    }

    let values;

    try {
      values = validate(req.body);
    } catch (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    const { rows } = await pool.query(
      `
        UPDATE public.healthcare_facilities
        SET
          facility_name = $1,
          facility_type = $2,
          ownership = $3,
          address = $4,
          geom = ST_SetSRID(
            ST_MakePoint($5, $6),
            4326
          )
        WHERE id = $7
        RETURNING id
      `,
      [...values, id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Facility not found.'
      });
    }

    res.json(rows[0]);
  })
);


/* =========================================================
   API: DELETE FACILITY
   ========================================================= */

app.delete(
  '/api/facilities/:id',
  auth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Invalid ID.'
      });
    }

    const { rows } = await pool.query(
      `
        DELETE FROM public.healthcare_facilities
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Facility not found.'
      });
    }

    res.json({
      deleted: id
    });
  })
);


/* =========================================================
   API FALLBACK AND FRONTEND
   ========================================================= */

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API route not found.'
  });
});

app.use(
  express.static(
    path.join(__dirname, '..', 'public')
  )
);


/* =========================================================
   START SERVER
   ========================================================= */

// Start the server when running locally.
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, () => {
    console.log(
      `Quetta Health Atlas: http://localhost:${port}`
    );
  });
}

// Allow Vercel to use the Express application.
module.exports = app;