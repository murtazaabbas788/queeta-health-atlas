'use strict';

const $ = id => document.getElementById(id);

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

let facilities = [];
let visible = [];
let markers = new Map();

let currentToken =
  sessionStorage.getItem('qha_token') || '';

let role = null;
let nearPoint = null;
let userMarker = null;
let userCircle = null;


/* MAP */

const map = L.map('map', {
  attributionControl: false,
  zoomControl: false
}).setView([30.185, 67.0], 12);

L.control.zoom({
  position: 'bottomright'
}).addTo(map);


/* BASEMAPS */

const basemaps = {
  streets: L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19
    }
  ),

  topo: L.tileLayer(
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      maxNativeZoom: 17
    }
  ),

  dark: L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      className: 'dark-tiles'
    }
  ),

  satellite: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      maxNativeZoom: 17
    }
  )
};

basemaps.streets.addTo(map);

let baseName = 'streets';


/* CLUSTERS */

const cluster = L.markerClusterGroup
  ? L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,

      iconCreateFunction: group =>
        L.divIcon({
          html: `<span>${group.getChildCount()}</span>`,
          className: 'cluster-icon',
          iconSize: [42, 42]
        })
    })
  : L.layerGroup();

cluster.addTo(map);


/* NOTIFICATIONS */

function notify(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    $('toast').classList.remove('show');
  }, 3500);
}

if (!L.markerClusterGroup) {
  notify(
    'Marker clustering could not load. Individual markers are shown.'
  );
}


/* FACILITY CATEGORIES */

function category(facility) {
  const isHospital = /hospital/i.test(
    facility.facility_type || ''
  );

  if (!isHospital) {
    return 'healthcare';
  }

  const owner = String(facility.ownership || '')
    .trim()
    .toLowerCase();

  if (owner === 'public') {
    return 'public';
  }

  if (owner === 'private') {
    return 'private';
  }

  return 'healthcare';
}

const label = {
  public: 'Public hospital',
  private: 'Private hospital',
  healthcare: 'Healthcare facility'
};

const symbol = {
  public: '✚',
  private: '◆',
  healthcare: '✣'
};

function icon(type) {
  return L.divIcon({
    className: 'map-icon',

    html: `
      <span class="marker-symbol ${type}">
        ${symbol[type]}
      </span>
    `,

    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}


/* COORDINATES */

function validCoordinates(facility) {
  return (
    facility.latitude !== null &&
    facility.longitude !== null &&
    Number.isFinite(Number(facility.latitude)) &&
    Number.isFinite(Number(facility.longitude)) &&
    Math.abs(Number(facility.latitude)) <= 90 &&
    Math.abs(Number(facility.longitude)) <= 180
  );
}

function coords(facility) {
  return [
    Number(facility.latitude),
    Number(facility.longitude)
  ];
}

function distance(a, b) {
  return map.distance(a, b);
}


/* API REQUESTS */

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',

    ...(currentToken
      ? { 'x-token': currentToken }
      : {}),

    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw Error('The server returned an invalid response.');
  }

  if (!response.ok) {
    throw Error(
      data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}


/* FILTER HELPERS */

function enabled(type) {
  return document.querySelector(
    `#categoryFilters input[value="${type}"]`
  ).checked;
}

function matches(facility, query) {
  return [
    facility.facility_name,
    facility.facility_type,
    facility.ownership,
    facility.address
  ].some(value =>
    String(value || '')
      .toLowerCase()
      .includes(query)
  );
}


/* FACILITY POPUP */

function popup(facility) {
  const type = category(facility);
  const point = coords(facility);

  const number = String(
    facility.contact_number || ''
  ).trim();

  const dial = number.replace(/[^\d+]/g, '');

  let phone = 'Not available';

  if (number) {
    phone = /^\+?\d+$/.test(dial)
      ? `<a href="tel:${dial}">${esc(number)}</a>`
      : esc(number);
  }

  return `
    <div
      class="facility-card"
      data-id="${esc(facility.id)}"
    >

      <div class="facility-card-head ${type}">

        <span>${esc(label[type])}</span>

        <h3>${esc(facility.facility_name)}</h3>

        <p>
          ${esc(facility.facility_type)}
          ·
          ${esc(facility.ownership || 'Unknown')}
        </p>

      </div>

      <div class="facility-card-body">

        <div class="facility-row">

          <span>Address</span>

          <strong>
            ${esc(facility.address || 'Not available')}
          </strong>

        </div>

        <div class="facility-row">

          <span>Contact</span>

          <strong>${phone}</strong>

        </div>

        <div class="facility-row">

          <span>Coordinates</span>

          <strong>
            ${point[0].toFixed(6)},
            ${point[1].toFixed(6)}
          </strong>

        </div>

        <div class="facility-actions">

          <a
            class="facility-primary"
            href="https://www.google.com/maps/dir/?api=1&amp;destination=${point[0]},${point[1]}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions ↗
          </a>

          <button type="button" data-action="copy">
            Copy coordinates
          </button>

          <button type="button" data-action="zoom">
            Zoom to facility
          </button>

          <button type="button" data-action="edit">
            Manage record
          </button>

        </div>

        <small class="facility-disclaimer">
          Facility information may need verification.
        </small>

      </div>

    </div>
  `;
}


/* RENDER FACILITIES */

function render() {
  const query = $('search').value.trim().toLowerCase();

  visible = facilities.filter(facility => {
    const categoryMatches = enabled(category(facility));

    const searchMatches =
      !query || matches(facility, query);

    const locationMatches =
      !nearPoint ||
      (
        validCoordinates(facility) &&
        distance(nearPoint, coords(facility)) <= 5000
      );

    return (
      categoryMatches &&
      searchMatches &&
      locationMatches
    );
  });

  cluster.clearLayers();
  markers.clear();

  visible.forEach(facility => {
    if (!validCoordinates(facility)) return;

    const marker = L.marker(coords(facility), {
      icon: icon(category(facility)),
      title: facility.facility_name
    }).bindPopup(popup(facility));

    cluster.addLayer(marker);
    markers.set(String(facility.id), marker);
  });

  $('resultCount').textContent =
    `${visible.length} OF ${facilities.length} FACILITIES` +
    (nearPoint ? ' · WITHIN 5 KM' : '');

  $('list').innerHTML = visible.length
    ? visible.map(facility => `
        <button
          class="place"
          data-id="${esc(facility.id)}"
        >

          <span class="mini-icon ${category(facility)}">
            ${symbol[category(facility)]}
          </span>

          <span>

            <strong>
              ${esc(facility.facility_name)}
            </strong>

            <small>
              ${esc(facility.facility_type)}
              ·
              ${esc(facility.ownership || 'Unknown')}
            </small>

          </span>

          <span class="arrow">↗</span>

        </button>
      `).join('')
    : '<p class="empty">No facilities match these filters.</p>';

  const counts = {
    public: 0,
    private: 0,
    healthcare: 0
  };

  facilities.forEach(facility => {
    counts[category(facility)]++;
  });

  $('countAll').textContent = facilities.length;

  $('countPublic').textContent =
    facilities.filter(facility =>
      String(facility.ownership || '')
        .trim()
        .toLowerCase() === 'public'
    ).length;

  $('countPrivate').textContent =
    facilities.filter(facility =>
      String(facility.ownership || '')
        .trim()
        .toLowerCase() === 'private'
    ).length;

  $('nPublic').textContent = counts.public;
  $('nPrivate').textContent = counts.private;
  $('nCare').textContent = counts.healthcare;

  $('dataStats').innerHTML = `
    <div>
      <span>Total facilities</span>
      <b>${facilities.length}</b>
    </div>

    <div>
      <span>Public hospitals</span>
      <b>${counts.public}</b>
    </div>

    <div>
      <span>Private hospitals</span>
      <b>${counts.private}</b>
    </div>

    <div>
      <span>Healthcare facilities</span>
      <b>${counts.healthcare}</b>
    </div>

    <div>
      <span>Visible after filters</span>
      <b>${visible.length}</b>
    </div>
  `;
}


/* SEARCH */

function renderSuggestions() {
  const query = $('search').value.trim().toLowerCase();

  const found = query
    ? facilities.filter(facility => matches(facility, query))
    : [];

  $('searchResults').innerHTML = found
    .map(facility => `
      <button data-id="${esc(facility.id)}">

        <span class="mini-icon ${category(facility)}">
          ${symbol[category(facility)]}
        </span>

        <span>

          <strong>
            ${esc(facility.facility_name)}
          </strong>

          <small>
            ${esc(facility.facility_type)}
          </small>

        </span>

      </button>
    `)
    .join('') ||
    (
      query
        ? '<p class="empty">No matches found.</p>'
        : ''
    );

  $('searchResults').hidden = !query;
}


/* OPEN FACILITY */

function showFacility(id) {
  const facility = facilities.find(
    item => String(item.id) === String(id)
  );

  if (!facility || !validCoordinates(facility)) {
    return notify(
      'This facility has no valid coordinates.'
    );
  }

  document.querySelector(
    `#categoryFilters input[value="${category(facility)}"]`
  ).checked = true;

  $('search').value = '';
  $('searchResults').hidden = true;

  nearPoint = null;

  if (userMarker) {
    map.removeLayer(userMarker);
  }

  if (userCircle) {
    map.removeLayer(userCircle);
  }

  userMarker = null;
  userCircle = null;

  render();

  const marker = markers.get(String(id));

  if (cluster.zoomToShowLayer) {
    cluster.zoomToShowLayer(
      marker,
      () => marker.openPopup()
    );
  } else {
    map.setView(coords(facility), 16);
    marker.openPopup();
  }
}


/* FIT MAP */

function fitVisible() {
  const points = visible
    .filter(validCoordinates)
    .map(coords);

  if (points.length) {
    map.fitBounds(
      L.latLngBounds(points),
      {
        padding: [55, 55],
        maxZoom: 16
      }
    );
  } else {
    notify('No visible facilities to fit.');
  }
}


/* LOAD DATA */

async function loadData() {
  $('apiStatus').innerHTML = '<i></i> Connecting';

  try {
    const data = await request('/api/facilities');

    if (!Array.isArray(data)) {
      throw Error('Unexpected facility response.');
    }

    facilities = data;

    $('apiStatus').innerHTML =
      '<i></i> Database connected';

    $('apiStatus').classList.remove('offline');

    render();
    updateSelect();
  } catch (error) {
    $('apiStatus').innerHTML =
      '<i></i> Database unavailable';

    $('apiStatus').classList.add('offline');

    $('resultCount').textContent =
      'DATABASE UNAVAILABLE';

    notify(error.message);
  }
}


/* ADMIN / EDITOR */

function updateSelect(
  selected = $('recordSelect').value
) {
  $('recordSelect').innerHTML =
    '<option value="">+ New facility</option>' +
    facilities.map(facility => `
      <option value="${esc(facility.id)}">
        ${esc(facility.facility_name)}
      </option>
    `).join('');

  if (
    facilities.some(
      facility =>
        String(facility.id) === String(selected)
    )
  ) {
    $('recordSelect').value = selected;
  }
}

function populateForm() {
  const facility = facilities.find(
    item => String(item.id) === $('recordSelect').value
  );

  $('facilityName').value =
    facility?.facility_name || '';

  $('facilityType').value =
    facility?.facility_type || '';

  $('ownership').value =
    ['Public', 'Private', 'Military', 'Unknown']
      .includes(facility?.ownership)
      ? facility.ownership
      : 'Unknown';

  $('address').value =
    facility?.address || '';

  $('lat').value =
    facility?.latitude ?? '';

  $('lon').value =
    facility?.longitude ?? '';

  $('deleteRecord').disabled = !facility;
  $('formError').textContent = '';
}

function updateAuth() {
  $('loginForm').hidden = !!role;
  $('manager').hidden = !role;

  $('roleText').textContent = role
    ? `Signed in as ${role}. Changes update PostgreSQL.`
    : '';

  $('manage').textContent = role
    ? 'Manage facilities'
    : 'Admin & editor';
}

async function checkAuth() {
  if (!currentToken) {
    role = null;
    updateAuth();
    return false;
  }

  try {
    const result = await request('/api/me');

    role = result.role;

    if (!role) {
      throw Error('Invalid token.');
    }

    updateAuth();
    return true;
  } catch {
    role = null;
    currentToken = '';

    sessionStorage.removeItem('qha_token');

    updateAuth();
    return false;
  }
}


/* OPEN / CLOSE MANAGER */

$('manage').onclick = () => {
  updateAuth();
  $('accessDialog').showModal();
};

document.querySelector(
  '[data-close="accessDialog"]'
).onclick = () => {
  $('accessDialog').close();
};

$('accessDialog').addEventListener('click', event => {
  if (event.target === $('accessDialog')) {
    $('accessDialog').close();
  }
});


/* LOGIN */

$('loginForm').onsubmit = async event => {
  event.preventDefault();

  currentToken = $('tokenInput').value.trim();
  $('loginError').textContent = '';

  if (await checkAuth()) {
    sessionStorage.setItem(
      'qha_token',
      currentToken
    );

    $('tokenInput').value = '';

    updateSelect();
    populateForm();
  } else {
    $('loginError').textContent =
      'Invalid token or server unavailable. Check your token and server.';
  }
};


/* LOGOUT */

$('logout').onclick = () => {
  currentToken = '';
  role = null;

  sessionStorage.removeItem('qha_token');

  updateAuth();
  $('accessDialog').close();

  notify('Signed out.');
};


/* SELECT / ADD */

$('recordSelect').onchange = populateForm;

$('newRecord').onclick = () => {
  $('recordSelect').value = '';

  populateForm();

  $('facilityName').focus();
};


/* SAVE FACILITY */

$('facilityForm').onsubmit = async event => {
  event.preventDefault();

  $('formError').textContent = '';

  const id = $('recordSelect').value;

  const body = {
    facility_name: $('facilityName').value.trim(),
    facility_type: $('facilityType').value.trim(),
    ownership: $('ownership').value,
    address: $('address').value.trim(),
    latitude: $('lat').value,
    longitude: $('lon').value
  };

  try {
    const result = await request(
      id
        ? `/api/facilities/${encodeURIComponent(id)}`
        : '/api/facilities',
      {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      }
    );

    await loadData();

    updateSelect(String(id || result.id));
    populateForm();

    notify(
      id
        ? 'Facility updated.'
        : 'Facility added.'
    );
  } catch (error) {
    $('formError').textContent = error.message;
  }
};


/* DELETE FACILITY */

$('deleteRecord').onclick = async () => {
  const id = $('recordSelect').value;

  const facility = facilities.find(
    item => String(item.id) === id
  );

  if (
    !facility ||
    !confirm(
      `Delete ${facility.facility_name}? This removes it from the database.`
    )
  ) {
    return;
  }

  try {
    await request(
      `/api/facilities/${encodeURIComponent(id)}`,
      {
        method: 'DELETE'
      }
    );

    $('recordSelect').value = '';

    await loadData();
    populateForm();

    notify('Facility deleted.');
  } catch (error) {
    $('formError').textContent = error.message;
  }
};


/* SIDEBAR */

function toggleSidebar() {
  const closed = $('workspace')
    .classList.toggle('sidebar-closed');

  $('toggleSide').setAttribute(
    'aria-expanded',
    String(!closed)
  );

  $('sideHandle').textContent =
    closed ? '›' : '‹';

  setTimeout(() => {
    map.invalidateSize();
  }, 250);
}

$('toggleSide').onclick = toggleSidebar;
$('sideHandle').onclick = toggleSidebar;

document.querySelectorAll('[data-tab]')
  .forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('[data-tab]')
        .forEach(item => {
          item.classList.toggle(
            'active',
            item === button
          );
        });

      document.querySelectorAll('.pane')
        .forEach(pane => {
          pane.hidden =
            pane.id !== `pane-${button.dataset.tab}`;
        });
    };
  });


/* SEARCH EVENTS */

$('search').addEventListener('input', () => {
  render();
  renderSuggestions();
});

$('search').addEventListener(
  'focus',
  renderSuggestions
);

document.addEventListener('click', event => {
  if (!event.target.closest('.search-wrap')) {
    $('searchResults').hidden = true;
  }
});

$('searchResults').onclick = event => {
  const button = event.target.closest('[data-id]');

  if (button) {
    showFacility(button.dataset.id);
  }
};

$('list').onclick = event => {
  const button = event.target.closest('[data-id]');

  if (button) {
    showFacility(button.dataset.id);
  }
};


/* FILTERS */

$('categoryFilters').onchange = render;

$('reset').onclick = () => {
  document.querySelectorAll('#categoryFilters input')
    .forEach(input => {
      input.checked = true;
    });

  $('search').value = '';
  nearPoint = null;

  if (userMarker) {
    map.removeLayer(userMarker);
  }

  if (userCircle) {
    map.removeLayer(userCircle);
  }

  userMarker = null;
  userCircle = null;

  render();
};

$('fit').onclick = fitVisible;
$('mapFit').onclick = fitVisible;

$('refresh').onclick = () => loadData();


/* NEARBY FACILITIES */

function locate() {
  if (!navigator.geolocation) {
    return notify(
      'Location is not supported by this browser.'
    );
  }

  notify('Finding your location…');

  navigator.geolocation.getCurrentPosition(
    position => {
      nearPoint = [
        position.coords.latitude,
        position.coords.longitude
      ];

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      if (userCircle) {
        map.removeLayer(userCircle);
      }

      userMarker = L.circleMarker(nearPoint, {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#2257cc',
        fillOpacity: 1
      })
        .addTo(map)
        .bindPopup('Your approximate location');

      userCircle = L.circle(nearPoint, {
        radius: 5000,
        color: '#2257cc',
        weight: 1,
        fillOpacity: 0.05
      }).addTo(map);

      render();
      map.setView(nearPoint, 12);

      notify(
        `${visible.length} facilities within 5 km (straight-line distance).`
      );
    },

    () => {
      notify(
        'Location unavailable. Allow location access and try again.'
      );
    },

    {
      timeout: 15000,
      enableHighAccuracy: false
    }
  );
}

$('near').onclick = locate;
$('locate').onclick = locate;


/* BASEMAP SWITCHING */

document.querySelectorAll('[data-base]')
  .forEach(button => {
    button.onclick = () => {
      const next = button.dataset.base;

      if (!basemaps[next]) return;

      map.removeLayer(basemaps[baseName]);

      baseName = next;

      basemaps[baseName].addTo(map);

      if (baseName === 'satellite') {
        $('baseCredit').innerHTML =
          ' | Tiles © Esri, Maxar, Earthstar Geographics and the GIS User Community';
      } else if (baseName === 'topo') {
        $('baseCredit').innerHTML =
          ' | Elevation: SRTM · Map style © ' +
          '<a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a> (CC BY-SA)';
      } else {
        $('baseCredit').textContent = '';
      }

      document.querySelectorAll('[data-base]')
        .forEach(item => {
          const active =
            item.dataset.base === baseName;

          item.classList.toggle('active', active);

          item.setAttribute(
            'aria-pressed',
            String(active)
          );
        });
    };
  });


/* POPUP BUTTON ACTIONS */

map.on('popupopen', event => {
  const popupElement = event.popup.getElement();

  const card =
    popupElement?.querySelector('.facility-card');

  if (!card) return;

  const facility = facilities.find(
    item => String(item.id) === card.dataset.id
  );

  if (!facility) return;

  const point = coords(facility);

  const zoomButton =
    card.querySelector('[data-action="zoom"]');

  const copyButton =
    card.querySelector('[data-action="copy"]');

  const editButton =
    card.querySelector('[data-action="edit"]');

  zoomButton.onclick = () => {
    map.setView(
      point,
      Math.max(map.getZoom(), 16)
    );
  };

  copyButton.onclick = async () => {
    const value = point
      .map(number => number.toFixed(6))
      .join(', ');

    try {
      if (!navigator.clipboard?.writeText) {
        throw Error('Clipboard unavailable');
      }

      await navigator.clipboard.writeText(value);

      notify('Coordinates copied.');
    } catch {
      window.prompt(
        'Copy these coordinates:',
        value
      );
    }
  };

  editButton.onclick = () => {
    updateAuth();

    if (role) {
      updateSelect(String(facility.id));
      populateForm();
    } else {
      $('loginError').textContent =
        'Sign in, then select the facility to edit.';
    }

    $('accessDialog').showModal();
  };
});


/* DOWNLOAD HELPER */

function download(name, type, content) {
  const link = document.createElement('a');

  link.href = URL.createObjectURL(
    new Blob([content], { type })
  );

  link.download = name;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 1000);
}


/* EXPORT HELPERS */

function exportProperties(facility) {
  const {
    latitude,
    longitude,
    geometry,
    ...properties
  } = facility;

  return properties;
}

function csvValue(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  const text = typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);

  return '"' + text.replace(/"/g, '""') + '"';
}


/* CSV EXPORT */

$('csv').onclick = () => {
  if (!visible.length) {
    return notify(
      'There are no visible facilities to export.'
    );
  }

  const keys = new Set();

  visible.forEach(facility => {
    Object.keys(exportProperties(facility))
      .forEach(key => keys.add(key));
  });

  const preferred = [
    'id',
    'facility_name',
    'facility_type',
    'ownership',
    'address',
    'contact_number',
    'notes'
  ];

  const fields = [
    ...preferred.filter(key => keys.has(key)),

    ...Array.from(keys)
      .filter(key => !preferred.includes(key))
      .sort(),

    'latitude',
    'longitude'
  ];

  const rows = [
    fields.map(csvValue).join(','),

    ...visible.map(facility => {
      const data = {
        ...exportProperties(facility),
        latitude: facility.latitude,
        longitude: facility.longitude
      };

      return fields
        .map(field => csvValue(data[field]))
        .join(',');
    })
  ];

  download(
    'quetta_healthcare_facilities.csv',
    'text/csv;charset=utf-8',
    '\ufeff' + rows.join('\r\n')
  );

  notify(`CSV exported: ${visible.length} facilities.`);
};


/* GEOJSON EXPORT */

$('geojson').onclick = () => {
  const valid = visible.filter(validCoordinates);

  if (!valid.length) {
    return notify(
      'No visible facilities have valid coordinates.'
    );
  }

  const collection = {
    type: 'FeatureCollection',

    features: valid.map(facility => ({
      type: 'Feature',

      geometry: {
        type: 'Point',
        coordinates: [
          Number(facility.longitude),
          Number(facility.latitude)
        ]
      },

      properties: exportProperties(facility)
    }))
  };

  download(
    'quetta_healthcare_facilities.geojson',
    'application/geo+json;charset=utf-8',
    JSON.stringify(collection, null, 2)
  );

  const skipped = visible.length - valid.length;

  notify(
    skipped
      ? `Exported ${valid.length}; skipped ${skipped} invalid locations.`
      : `GeoJSON exported: ${valid.length} facilities.`
  );
};


/* GEOPACKAGE EXPORT */

$('gpkg').onclick = async () => {
  if (!visible.length) {
    return notify(
      'There are no visible facilities to export.'
    );
  }

  const button = $('gpkg');
  button.disabled = true;

  try {
    const response = await fetch(
      '/api/export/geopackage',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          ids: visible.map(facility =>
            Number(facility.id)
          )
        })
      }
    );

    if (!response.ok) {
      let detail;

      try {
        detail = await response.json();
      } catch {
        detail = {};
      }

      throw Error(
        detail.error ||
        `GeoPackage export failed (${response.status}).`
      );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'quetta_healthcare_facilities.gpkg';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);

    notify('GeoPackage download started.');
  } catch (error) {
    notify(error.message || 'GeoPackage export failed.');
  } finally {
    button.disabled = false;
  }
};


/* MAP COORDINATES */

map.on('mousemove', event => {
  $('coords').textContent =
    `${event.latlng.lat.toFixed(5)}° N  ` +
    `${event.latlng.lng.toFixed(5)}° E · ` +
    `Zoom ${map.getZoom()}`;
});

map.on('zoomend', () => {
  $('coords').textContent =
    `Zoom ${map.getZoom()}`;
});


/* PAKISTAN TIME */

function tick() {
  const now = new Date();

  $('clock').textContent =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now);

  $('date').textContent =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(now) + ' · PKT';
}


/* START */

tick();

setInterval(tick, 1000);

checkAuth();

loadData();