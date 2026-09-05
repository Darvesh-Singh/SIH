/* ==========================================================================
   OceanEmbed AI - Leaflet GIS Ocean Map Module
   ========================================================================== */

let oceanMap = null;
let selectedMarker = null;
let argoMarkersLayer = null;

// Initial preset hot spots & ARGO Float network locations
const ARGO_FLOATS = [
  { id: "#29014", lat: 15.420, lon: 73.150, region: "Arabian Sea Sector A", temp0m: 29.5, temp200m: 18.2, status: "Anomaly Spike" },
  { id: "#29088", lat: 18.620, lon: 88.610, region: "Bay of Bengal Sector 2", temp0m: 30.1, temp200m: 19.4, status: "Normal" },
  { id: "#39012", lat: 8.800, lon: 65.500, region: "Central Indian Ocean", temp0m: 28.2, temp200m: 16.8, status: "Normal" },
  { id: "#19045", lat: 12.100, lon: 74.800, region: "Lakshadweep Basin", temp0m: 29.8, temp200m: 17.9, status: "Thermocline Shift" },
  { id: "#49077", lat: 6.500, lon: 82.300, region: "Sri Lanka Dome Sector", temp0m: 28.9, temp200m: 15.6, status: "Normal" }
];

function initOceanMap() {
  const mapElement = document.getElementById('gisMap');
  if (!mapElement) return;

  // Destroy existing instance if any
  if (oceanMap) {
    oceanMap.remove();
  }

  // Initialize Leaflet map
  oceanMap = L.map('gisMap', {
    center: [12.5, 76.0],
    zoom: 5,
    zoomControl: false
  });

  // Add custom zoom control at top right
  L.control.zoom({ position: 'topright' }).addTo(oceanMap);

  // High quality Esri World Ocean Basemap with bathymetry details
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri, GEBCO, NOAA, CHS, GEBCO, SIO, CENCO',
    maxZoom: 13,
    opacity: 0.8
  }).addTo(oceanMap);

  // Overlay Dark Labels for Ocean Navigation
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 13,
    opacity: 0.7
  }).addTo(oceanMap);

  // Layer group for float markers
  argoMarkersLayer = L.layerGroup().addTo(oceanMap);

  // Render ARGO Floats on map
  renderArgoFloats();

  // Handle map clicks to set target location
  oceanMap.on('click', function(e) {
    const lat = parseFloat(e.latlng.lat.toFixed(3));
    const lon = parseFloat(e.latlng.lng.toFixed(3));
    selectCoordinates(lat, lon, "Custom User Selection");
  });
}

function renderArgoFloats() {
  argoMarkersLayer.clearLayers();

  ARGO_FLOATS.forEach(float => {
    const isAnomaly = float.status.includes("Anomaly") || float.status.includes("Shift");
    const markerColor = isAnomaly ? '#ef4444' : '#3b82f6';

    const customIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative group cursor-pointer">
          <span class="flex h-5 w-5 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isAnomaly ? 'bg-red-400' : 'bg-blue-400'} opacity-75"></span>
            <span class="relative inline-flex rounded-full h-5 w-5 ${isAnomaly ? 'bg-red-500' : 'bg-blue-600'} border-2 border-white items-center justify-center text-[9px] text-white font-bold">
              <i class="fa-solid fa-satellite"></i>
            </span>
          </span>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([float.lat, float.lon], { icon: customIcon }).addTo(argoMarkersLayer);

    const popupContent = `
      <div class="p-2 space-y-1.5 min-w-[200px]">
        <div class="flex justify-between items-center">
          <span class="text-xs font-bold text-white">${float.region}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-mono ${isAnomaly ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400'}">${float.status}</span>
        </div>
        <p class="text-[11px] text-slate-300 font-mono">ARGO Float ID: ${float.id}</p>
        <p class="text-[11px] text-slate-400 font-mono">Coords: ${float.lat}° N, ${float.lon}° E</p>
        <div class="text-[10px] text-slate-300 grid grid-cols-2 gap-1 pt-1 border-t border-slate-700">
          <div>SST (0m): <strong class="text-cyan-400">${float.temp0m}°C</strong></div>
          <div>200m Temp: <strong class="text-emerald-400">${float.temp200m}°C</strong></div>
        </div>
        <button onclick="selectCoordinates(${float.lat}, ${float.lon}, '${float.region}')" class="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold py-1 rounded transition">
          Reconstruct Subsurface Profile <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);
  });
}

function selectCoordinates(lat, lon, regionName = "Selected Coordinates") {
  // Update global application state
  if (window.OceanState) {
    window.OceanState.currentLat = lat;
    window.OceanState.currentLon = lon;
    window.OceanState.currentRegion = regionName;
  }

  // Update UI coordinate display elements
  document.querySelectorAll('.display-coords').forEach(el => {
    el.textContent = `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`;
  });
  document.querySelectorAll('.display-region').forEach(el => {
    el.textContent = regionName;
  });

  // Highlight marker on map
  if (selectedMarker) {
    oceanMap.removeLayer(selectedMarker);
  }

  const highlightIcon = L.divIcon({
    className: 'selected-target-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-6 w-6 bg-cyan-500 border-2 border-white items-center justify-center text-white text-[10px]">
          <i class="fa-solid fa-crosshairs"></i>
        </span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  selectedMarker = L.marker([lat, lon], { icon: highlightIcon }).addTo(oceanMap);
  oceanMap.panTo([lat, lon], { animate: true, duration: 0.8 });

  // Trigger profile update if in node 4/5
  if (window.updateProfileData) {
    window.updateProfileData(lat, lon);
  }
}
