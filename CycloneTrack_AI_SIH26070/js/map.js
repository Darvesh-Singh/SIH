/* ==========================================================================
   CycloneTrack AI - Leaflet GIS Multi-Source Cyclone Tracker
   ========================================================================== */

let cycloneMap = null;
let activeTrackLayer = null;
let satelliteOverlayLayer = null;

// Benchmark Cyclone Track & Telemetry Profiles
const CYCLONES = {
  biparjoy: {
    name: "Very Severe Cyclonic Storm BIPARJOY",
    basin: "Arabian Sea",
    tNumber: "T4.5",
    category: "VSCS (Very Severe Cyclonic Storm)",
    vmax: 95, // knots
    vmaxKmph: 175,
    pmin: 968, // hPa
    movement: "NNW at 12 km/h",
    landfallLocation: "Jaukhau Port, Gujarat",
    landfallTime: "15 June 2026, 18:00 UTC",
    riStatus: "Rapid Intensification Warning Active (+35 kts / 24h)",
    observedTrack: [
      { lat: 12.5, lon: 66.2, time: "08 Jun 06:00", vmax: 45, pmin: 996 },
      { lat: 14.1, lon: 66.0, time: "09 Jun 12:00", vmax: 60, pmin: 988 },
      { lat: 16.8, lon: 67.4, time: "11 Jun 00:00", vmax: 85, pmin: 975 },
      { lat: 19.5, lon: 67.8, time: "13 Jun 06:00", vmax: 95, pmin: 968 }
    ],
    forecastTrack: [
      { lat: 21.2, lon: 68.2, time: "14 Jun 06:00 (FCST +24h)", vmax: 90, pmin: 970, radiusKm: 65 },
      { lat: 22.8, lon: 68.8, time: "15 Jun 06:00 (FCST +48h)", vmax: 80, pmin: 976, radiusKm: 110 },
      { lat: 23.6, lon: 69.5, time: "16 Jun 06:00 (FCST +72h - Landfall)", vmax: 55, pmin: 985, radiusKm: 160 }
    ]
  },
  mocha: {
    name: "Extremely Severe Cyclonic Storm MOCHA",
    basin: "Bay of Bengal",
    tNumber: "T6.0",
    category: "ESCS (Extremely Severe Cyclonic Storm)",
    vmax: 115,
    vmaxKmph: 210,
    pmin: 938,
    movement: "NE at 18 km/h",
    landfallLocation: "Sittwe, Myanmar / Cox's Bazar",
    landfallTime: "14 May 2026, 12:00 UTC",
    riStatus: "Extremely Rapid Intensification Detected",
    observedTrack: [
      { lat: 11.2, lon: 88.0, time: "10 May 06:00", vmax: 50, pmin: 992 },
      { lat: 13.5, lon: 88.8, time: "11 May 12:00", vmax: 75, pmin: 980 },
      { lat: 16.0, lon: 90.2, time: "12 May 18:00", vmax: 100, pmin: 952 },
      { lat: 18.2, lon: 91.5, time: "13 May 12:00", vmax: 115, pmin: 938 }
    ],
    forecastTrack: [
      { lat: 20.1, lon: 92.5, time: "14 May 12:00 (FCST +24h - Landfall)", vmax: 110, pmin: 942, radiusKm: 80 },
      { lat: 22.4, lon: 94.1, time: "15 May 12:00 (FCST +48h)", vmax: 45, pmin: 990, radiusKm: 140 }
    ]
  },
  amphan: {
    name: "Super Cyclonic Storm AMPHAN",
    basin: "Bay of Bengal",
    tNumber: "T7.0",
    category: "SuCS (Super Cyclonic Storm)",
    vmax: 140,
    vmaxKmph: 260,
    pmin: 920,
    movement: "NNE at 15 km/h",
    landfallLocation: "Digha, West Bengal / Sundarbans",
    landfallTime: "20 May 2026, 15:00 UTC",
    riStatus: "Category 5 Equivalent Peak Intensity",
    observedTrack: [
      { lat: 10.8, lon: 86.3, time: "16 May 06:00", vmax: 55, pmin: 990 },
      { lat: 13.2, lon: 86.3, time: "17 May 12:00", vmax: 95, pmin: 965 },
      { lat: 16.5, lon: 86.5, time: "18 May 18:00", vmax: 140, pmin: 920 }
    ],
    forecastTrack: [
      { lat: 19.8, lon: 87.5, time: "19 May 18:00 (FCST +24h)", vmax: 120, pmin: 935, radiusKm: 70 },
      { lat: 21.7, lon: 88.3, time: "20 May 18:00 (FCST +48h - Landfall)", vmax: 85, pmin: 960, radiusKm: 130 }
    ]
  }
};

let currentCycloneKey = 'biparjoy';

function initCycloneMap() {
  const mapElement = document.getElementById('cycloneGisMap');
  if (!mapElement) return;

  if (cycloneMap) {
    cycloneMap.remove();
  }

  // Initialize Leaflet Map centered on Bay of Bengal / Arabian Sea
  cycloneMap = L.map('cycloneGisMap', {
    center: [18.0, 75.0],
    zoom: 5,
    zoomControl: false
  });

  L.control.zoom({ position: 'topright' }).addTo(cycloneMap);

  // High quality Esri Imagery / Dark ocean tiles
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri, Maxar, Earthstar Geographics, NOAA, IMD',
    maxZoom: 13,
    opacity: 0.75
  }).addTo(cycloneMap);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 13,
    opacity: 0.8
  }).addTo(cycloneMap);

  activeTrackLayer = L.layerGroup().addTo(cycloneMap);

  // Render current cyclone track & satellite layers
  renderCycloneTrack(currentCycloneKey);

  // Handle map click
  cycloneMap.on('click', (e) => {
    const lat = parseFloat(e.latlng.lat.toFixed(3));
    const lon = parseFloat(e.latlng.lng.toFixed(3));
    selectCycloneCoords(lat, lon);
  });
}

function renderCycloneTrack(cycloneKey) {
  currentCycloneKey = cycloneKey;
  const cyclone = CYCLONES[cycloneKey] || CYCLONES.biparjoy;

  activeTrackLayer.clearLayers();

  const obsCoords = cyclone.observedTrack.map(pt => [pt.lat, pt.lon]);
  const fcstCoords = [
    [cyclone.observedTrack[cyclone.observedTrack.length - 1].lat, cyclone.observedTrack[cyclone.observedTrack.length - 1].lon],
    ...cyclone.forecastTrack.map(pt => [pt.lat, pt.lon])
  ];

  // 1. Observed Track Polyline (Solid Red/Amber Line)
  L.polyline(obsCoords, {
    color: '#ef4444',
    weight: 4,
    opacity: 0.9,
    lineJoin: 'round'
  }).addTo(activeTrackLayer);

  // 2. Forecast Trajectory Polyline (Dashed Cyan Line)
  L.polyline(fcstCoords, {
    color: '#38bdf8',
    weight: 3,
    dashArray: '8, 8',
    opacity: 0.95
  }).addTo(activeTrackLayer);

  // 3. Forecast Uncertainty Cone Circles
  cyclone.forecastTrack.forEach(pt => {
    L.circle([pt.lat, pt.lon], {
      radius: pt.radiusKm * 1000, // convert km to meters
      color: '#38bdf8',
      fillColor: '#0284c7',
      fillOpacity: 0.15,
      weight: 1
    }).addTo(activeTrackLayer);
  });

  // 4. Observed Track Markers
  cyclone.observedTrack.forEach((pt, idx) => {
    const isLatest = idx === cyclone.observedTrack.length - 1;

    const iconHtml = isLatest ? `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-500 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-6 w-6 bg-red-600 border-2 border-white items-center justify-center text-white text-[10px] font-bold">
          <i class="fa-solid fa-hurricane"></i>
        </span>
      </div>
    ` : `
      <div class="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
    `;

    const marker = L.marker([pt.lat, pt.lon], {
      icon: L.divIcon({ className: 'custom-track-icon', html: iconHtml, iconSize: [24, 24], iconAnchor: [12, 12] })
    }).addTo(activeTrackLayer);

    marker.bindPopup(`
      <div class="p-2 space-y-1 text-xs">
        <p class="font-bold text-white">${cyclone.name}</p>
        <p class="text-slate-300 font-mono">Time: ${pt.time}</p>
        <p class="text-red-400 font-mono">Max Wind: ${pt.vmax} kts (${Math.round(pt.vmax * 1.852)} km/h)</p>
        <p class="text-cyan-400 font-mono">Pressure: ${pt.pmin} hPa</p>
      </div>
    `);
  });

  // 5. Forecast Track Markers
  cyclone.forecastTrack.forEach((pt) => {
    const marker = L.marker([pt.lat, pt.lon], {
      icon: L.divIcon({
        className: 'custom-fcst-icon',
        html: `<div class="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-white shadow-lg"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
    }).addTo(activeTrackLayer);

    marker.bindPopup(`
      <div class="p-2 space-y-1 text-xs">
        <p class="font-bold text-cyan-400">AI Track Forecast Position</p>
        <p class="text-slate-300 font-mono">${pt.time}</p>
        <p class="text-amber-400 font-mono">Forecast Wind: ${pt.vmax} kts</p>
        <p class="text-slate-400 font-mono">Central Pressure: ${pt.pmin} hPa</p>
      </div>
    `);
  });

  // Center map on cyclone center
  const centerPt = cyclone.observedTrack[cyclone.observedTrack.length - 1];
  cycloneMap.panTo([centerPt.lat, centerPt.lon], { animate: true });

  // Update State & UI
  if (window.CycloneState) {
    window.CycloneState.activeCyclone = cyclone;
  }
  updateCycloneUI(cyclone);
}

function updateCycloneUI(cyclone) {
  document.querySelectorAll('.display-cyclone-name').forEach(el => el.textContent = cyclone.name);
  document.querySelectorAll('.display-t-number').forEach(el => el.textContent = cyclone.tNumber);
  document.querySelectorAll('.display-category').forEach(el => el.textContent = cyclone.category);
  document.querySelectorAll('.display-vmax').forEach(el => el.textContent = `${cyclone.vmax} kts (${cyclone.vmaxKmph} km/h)`);
  document.querySelectorAll('.display-pmin').forEach(el => el.textContent = `${cyclone.pmin} hPa`);
  document.querySelectorAll('.display-movement').forEach(el => el.textContent = cyclone.movement);
  document.querySelectorAll('.display-landfall').forEach(el => el.textContent = `${cyclone.landfallLocation} (${cyclone.landfallTime})`);
}

function selectCycloneCoords(lat, lon) {
  document.querySelectorAll('.display-probe-coords').forEach(el => {
    el.textContent = `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`;
  });
}
