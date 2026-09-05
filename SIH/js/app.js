/* ==========================================================================
   OceanEmbed AI - Main Application Logic & State Engine
   ========================================================================== */

// Global State Object
window.OceanState = {
  activeNode: 1,
  userRole: "Oceanographer / Researcher (MoES)",
  userEmail: "researcher@moes.gov.in",
  currentLat: 15.420,
  currentLon: 73.150,
  currentRegion: "Arabian Sea Sector A",
  selectedDataset: "arabian_sea_2026",
  depthSlice: 150,
  modelName: "ViT-FNO Deep Operator (Neural PDE)",
  modelMAE: 0.28,
  confidence: 97.8,
  mld: 42.5, // Mixed Layer Depth (m)
  thermoclineGradient: -0.18 // °C / meter
};

document.addEventListener('DOMContentLoaded', () => {
  initBackgroundCanvas();
  initOceanMap();
  initOcean3DEngine();
  renderVerticalDepthChart();
  renderSoundVelocityChart();
});

/* ==========================================================================
   Ambient Underwater Canvas Animation (Perfect Ocean Background)
   ========================================================================== */
function initBackgroundCanvas() {
  const canvas = document.getElementById('ocean-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Bioluminescent floating ocean particles
  const particles = [];
  const particleCount = 45;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 0.5,
      speedY: -(Math.random() * 0.4 + 0.1),
      speedX: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * 0.02
    });
  }

  function drawBackground() {
    ctx.clearRect(0, 0, width, height);

    // Subtle bathymetric grid contour lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Render particles
    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.alpha += Math.sin(Date.now() * p.pulse) * 0.005;

      if (p.y < -10) p.y = height + 10;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56, 189, 248, ${Math.max(0.1, Math.min(0.7, p.alpha))})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(drawBackground);
  }

  drawBackground();
}

/* ==========================================================================
   Node / Screen Navigation Logic
   ========================================================================== */
function switchNode(nodeNumber) {
  window.OceanState.activeNode = nodeNumber;

  // Hide all screens
  document.querySelectorAll('.node-screen').forEach(el => el.classList.add('hidden'));
  
  // Reset nav button styling
  document.querySelectorAll('.node-btn').forEach(el => {
    el.classList.remove('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-600/30');
    el.classList.add('hover:bg-slate-800', 'text-slate-400');
  });

  // Show active screen
  const targetScreen = document.getElementById(`node-${nodeNumber}`);
  if (targetScreen) targetScreen.classList.remove('hidden');

  // Highlight active nav button
  const activeBtn = document.getElementById(`btn-node-${nodeNumber}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-600/30');
    activeBtn.classList.remove('hover:bg-slate-800', 'text-slate-400');
  }

  // Trigger specialized module initializations when navigating to specific nodes
  if (nodeNumber === 2) {
    setTimeout(() => {
      if (oceanMap) oceanMap.invalidateSize();
    }, 200);
  } else if (nodeNumber === 4) {
    setTimeout(() => {
      onWindowResize3D();
    }, 200);
  } else if (nodeNumber === 5) {
    renderVerticalDepthChart();
    renderSoundVelocityChart();
  }
}

/* ==========================================================================
   Role-Based Views Handler
   ========================================================================== */
function changeUserRole(roleName) {
  window.OceanState.userRole = roleName;
  document.querySelectorAll('.display-user-role').forEach(el => el.textContent = roleName);

  const defenseAlert = document.getElementById('defenseCommandCard');
  const fisheriesAlert = document.getElementById('fisheriesAlertCard');

  if (roleName.includes("Defense")) {
    if (defenseAlert) defenseAlert.classList.remove('hidden');
    if (fisheriesAlert) fisheriesAlert.classList.add('hidden');
  } else {
    if (defenseAlert) defenseAlert.classList.add('hidden');
    if (fisheriesAlert) fisheriesAlert.classList.remove('hidden');
  }
}

/* ==========================================================================
   Sample Dataset Loader & Drag-Drop Simulator
   ========================================================================== */
function loadPreloadedDataset(datasetId) {
  window.OceanState.selectedDataset = datasetId;
  const previewBox = document.getElementById('preview-box');
  const datasetTitle = document.getElementById('previewDatasetTitle');
  const datasetInfo = document.getElementById('previewDatasetInfo');

  if (datasetId === 'arabian_sea') {
    window.OceanState.currentRegion = "Arabian Sea Monsoon Sector";
    if (datasetTitle) datasetTitle.textContent = "arabian_sea_surface_monsoon_2026.nc";
    if (datasetInfo) datasetInfo.textContent = "SST, SSS, SSH, SLA & Wind Vectors (142MB)";
    selectCoordinates(15.420, 73.150, "Arabian Sea Monsoon Sector");
  } else if (datasetId === 'bay_of_bengal') {
    window.OceanState.currentRegion = "Bay of Bengal Cyclone Zone";
    if (datasetTitle) datasetTitle.textContent = "bay_of_bengal_cyclone_preconditioning.nc";
    if (datasetInfo) datasetInfo.textContent = "SST, SSS, SLA, Geostrophic Currents (185MB)";
    selectCoordinates(18.620, 88.610, "Bay of Bengal Cyclone Zone");
  } else if (datasetId === 'equatorial_io') {
    window.OceanState.currentRegion = "Equatorial Indian Ocean Basin";
    if (datasetTitle) datasetTitle.textContent = "equatorial_indian_ocean_dipole_2026.nc";
    if (datasetInfo) datasetInfo.textContent = "Satellite Surface Altimetry & SST (110MB)";
    selectCoordinates(0.500, 78.200, "Equatorial Indian Ocean Basin");
  }

  if (previewBox) previewBox.classList.remove('hidden');
}

function simulateUpload() {
  const previewBox = document.getElementById('preview-box');
  if (previewBox) previewBox.classList.remove('hidden');
}

/* ==========================================================================
   AI Neural Operator Inference Simulator
   ========================================================================== */
function runAIEngine() {
  switchNode(4);
  const statusBadge = document.getElementById('modelExecutionStatus');
  if (statusBadge) {
    statusBadge.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Running FNO Spectral Layers...`;
    statusBadge.className = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs px-2.5 py-1 rounded-full font-mono";
    
    setTimeout(() => {
      statusBadge.innerHTML = `<i class="fa-solid fa-check-circle mr-1"></i> 97.8% Model Confidence`;
      statusBadge.className = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-mono";
    }, 1200);
  }
}

/* ==========================================================================
   Export Engine (NetCDF, CSV & PDF Simulation)
   ========================================================================== */
function exportDataset(format) {
  const region = window.OceanState.currentRegion.replace(/\s+/g, '_').toLowerCase();
  const filename = `oceanembed_3d_subsurface_${region}_${Date.now()}.${format}`;
  
  if (format === 'nc') {
    alert(`[NetCDF Export Engine]\n\nGenerated 3D Ocean Volume NetCDF-4 File:\n- File: ${filename}\n- Grid: 0.25° x 0.25° x 50 depth levels (0-1000m)\n- Variables: temp, salinity, sound_velocity, mld\n\nDownload starting automatically...`);
  } else if (format === 'csv') {
    const csvContent = "data:text/csv;charset=utf-8,Depth_m,Temp_C,SoundSpeed_ms,MAE_C\n0,29.5,1542.1,0.22\n50,28.1,1539.8,0.24\n100,24.2,1528.4,0.26\n150,18.2,1512.0,0.28\n200,14.5,1501.2,0.29\n500,7.8,1482.5,0.30\n1000,4.1,1468.2,0.31";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === 'pdf') {
    alert(`[Hydrographic Report Generator]\n\nCompiled MoES/Naval Hydrographic PDF Report for ${window.OceanState.currentRegion}.\n- Lat/Lon: ${window.OceanState.currentLat}° N, ${window.OceanState.currentLon}° E\n- Thermocline Depth: 150m\n- SVP Min Channel: 850m\n\nOpening PDF Report preview...`);
  }
}
