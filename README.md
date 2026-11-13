# Quetta Health Atlas

Quetta Health Atlas is an interactive Web GIS application for exploring hospitals and other healthcare facilities in Quetta, Balochistan, Pakistan.

The project uses PostgreSQL and PostGIS to store facility locations as spatial points. An Express API retrieves the data and provides authenticated editing operations, while a Leaflet map displays the facilities and their attributes.

The application was developed as an academic project for the Web GIS Applications course.

## Live website

[Open Quetta Health Atlas](https://quetta-health-atlas.vercel.app/)


## Features

- Interactive map of hospitals and other healthcare facilities.
- Search facilities by name or available attributes.
- Display facility details, including address, contact number, ownership, and coordinates where available.
- Open directions to a facility in Google Maps.
- Display facility clusters when the map is zoomed out.
- Filter facilities by map category.
- Switch between streets, satellite, terrain, and dark basemaps.
- Use the **Near me** feature to find facilities near the user's location, subject to browser location permission.
- Download facility data as CSV, GeoJSON, or GeoPackage.
- Sign in as an authorized admin or editor to manage facility records.
- Add, update, and delete records through the API.

## Study area and data

The project focuses on healthcare facilities in the Quetta area of Balochistan, Pakistan. Facility locations were compiled from OpenStreetMap and supplemented through map-based review using available sources, including Google Maps.

The facility points were checked in QGIS against the supplied Quetta District boundary. The source and publication date of that boundary require documentation.

Facility information is an academic dataset and may require further verification. The map does not provide live information about facility operations, emergency availability, or service capacity.

## Technologies used

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Web mapping | Leaflet |
| Backend and API | Node.js, Express |
| Spatial database | PostgreSQL, PostGIS |
| Cloud database | Neon |
| Website hosting | Vercel |
| GIS review | QGIS |
| GeoPackage generation | sql.js |

## How the application works

1. Facility attributes and point geometries are stored in PostgreSQL/PostGIS.
2. The Express API queries the database and returns facility information.
3. The frontend retrieves the data and displays it on a Leaflet map.
4. Authorized users can submit changes through the management interface.
5. The database stores the changes, and the map can retrieve the updated records.

## Project structure

```text
quetta-health-atlas/
├── public/
│   ├── index.html          # Website structure
│   ├── style.css           # Website styling
│   └── app.js              # Map and frontend interactions
├── server/
│   └── server.js           # Express API and GeoPackage export
├── sql/                    # Database SQL backup
├── .env.example            # Example configuration
├── .gitignore
├── index.js                # Vercel application entry point
├── package.json
├── package-lock.json
└── README.md
```

## Database fields

The `public.healthcare_facilities` table contains the following fields:

| Field | Description |
|---|---|
| `id` | Unique facility identifier |
| `facility_name` | Name of the facility |
| `facility_type` | Type of facility |
| `ownership` | Recorded ownership category |
| `address` | Address, where available |
| `contact_number` | Contact number, where available |
| `notes` | Additional information or review notes, where available |
| `geom` | PostGIS point geometry in WGS 84, EPSG:4326 |

Latitude and longitude are read from the point geometry for display by the API.

## API endpoints

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Check the database connection | Public |
| GET | `/api/me` | Check the current token role | Public |
| GET | `/api/facilities` | Retrieve facilities | Public |
| GET | `/api/facilities/:id` | Retrieve one facility | Public |
| POST | `/api/facilities` | Add a facility | Admin or editor token |
| PUT | `/api/facilities/:id` | Update a facility | Admin or editor token |
| DELETE | `/api/facilities/:id` | Delete a facility | Admin or editor token |
| POST | `/api/export/geopackage` | Download selected facilities as a GeoPackage | Public |

The management API uses the `x-token` request header for admin or editor access.

## Running locally

### Requirements

- Node.js and npm
- PostgreSQL with the PostGIS extension, or access to a compatible Neon database
- A database containing the `public.healthcare_facilities` table

### 1. Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### 2. Configure environment variables

Create a file named `.env` in the project root:

```env
DATABASE_URL=your_postgresql_connection_string
ADMIN_TOKEN=your_admin_token
EDITOR_TOKEN=your_editor_token
PORT=3000
```

Replace the placeholder values with your own configuration.

If connecting to a cloud database, use the connection settings supplied by your database provider. The `DATABASE_URL` must point to a database that has PostGIS and the facility table configured.

### 3. Set up the database

Enable PostGIS in the target PostgreSQL database:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```


Database backups may require adjustments to ownership or permissions when restored to another PostgreSQL server.

### 4. Start the application

```bash
npm start
```

Open the address shown in the terminal. With the example configuration, it is:

```text
http://localhost:3000
```

To run the available syntax checks:

```bash
npm run check
```

## Deployment

The application can be deployed to Vercel, with PostgreSQL/PostGIS hosted on Neon.

Configure these environment variables in the hosting project:

- `DATABASE_URL`
- `ADMIN_TOKEN`
- `EDITOR_TOKEN`

Environment variables should be stored in the hosting provider's settings rather than committed to the repository.

## Data and map attribution

- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- [Leaflet](https://leafletjs.com/)
- Additional basemap attribution is displayed in the application when the relevant basemap is selected.

## Project limitations

- Facility locations and attributes may need further verification.
- A mapped point may represent a facility's approximate location rather than its entrance.
- The map does not show live healthcare service availability.
- Local and cloud database copies do not automatically synchronize.
- Facility records and counts may change as the database is updated.

## Author

**Murtaza bin Abbas**  
BS Remote Sensing and GIS  
COMSATS University Islamabad

Developed for the **Web GIS Applications** course.
