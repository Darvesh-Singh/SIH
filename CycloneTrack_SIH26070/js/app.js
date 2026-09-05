/* ==========================================================================
   CycloneTrack AI - Main Application Logic & State Engine
   ========================================================================== */

window.CycloneState = {
  activeNode: 1,
  userRole: "IMD Cyclone Warning Center (CWC) Meteorologist",
  userEmail: "cyclone.cwc@imd.gov.in",
  activeCycloneKey: "biparjoy",
  activeCyclone: null,
  selectedChannel: "TIR1"
};

document.addEventListener('DOMContentLoaded', () => {
  initBackgroundCanvas();
  initCycloneMap();
  initCyclone3DEngine();
  renderIntensityForecastChart();
  renderTrackErrorChart();
});

/* Ambient Hurricane Particles Background */
function initBackgroundCanvas() {
  const canvas = document.getElementById('cyclone-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 60;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.6 + 0.2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Subtle radar concentric distance rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    const centerX = width * 0.6;
    const centerY = height * 0.4;
    [100, 200, 300, 450, 600].forEach(r => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  draw();
}

/* Screen Navigation */
function switchNode(nodeNumber) {
  window.CycloneState.activeNode = nodeNumber;

  document.querySelectorAll('.node-screen').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.node-btn').forEach(el => {
    el.classList.remove('bg-red-600', 'text-white', 'shadow-lg', 'shadow-red-600/30');
    el.classList.add('hover:bg-slate-800', 'text-slate-400');
  });

  const targetScreen = document.getElementById(`node-${nodeNumber}`);
  if (targetScreen) targetScreen.classList.remove('hidden');

  const activeBtn = document.getElementById(`btn-node-${nodeNumber}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-red-600', 'text-white', 'shadow-lg', 'shadow-red-600/30');
    activeBtn.classList.remove('hover:bg-slate-800', 'text-slate-400');
  }

  if (nodeNumber === 2) {
    setTimeout(() => { if (cycloneMap) cycloneMap.invalidateSize(); }, 200);
  } else if (nodeNumber === 4) {
    setTimeout(() => { onWindowResizeCyclone3D(); }, 200);
  } else if (nodeNumber === 5) {
    renderIntensityForecastChart(window.CycloneState.activeCycloneKey);
    renderTrackErrorChart();
  }
}

/* User Role Switcher */
function changeCycloneRole(roleName) {
  window.CycloneState.userRole = roleName;
  document.querySelectorAll('.display-user-role').forEach(el => el.textContent = roleName);

  const ndmaAlert = document.getElementById('ndmaActionCard');
  if (roleName.includes("Disaster")) {
    if (ndmaAlert) ndmaAlert.classList.remove('hidden');
  } else {
    if (ndmaAlert) ndmaAlert.classList.add('hidden');
  }
}

/* Benchmark Cyclone Loader */
function loadCycloneDataset(cycloneKey) {
  window.CycloneState.activeCycloneKey = cycloneKey;
  renderCycloneTrack(cycloneKey);
  renderIntensityForecastChart(cycloneKey);
}

function toggleSatelliteChannel(channelName) {
  window.CycloneState.selectedChannel = channelName;
  const channelDisplay = document.getElementById('activeChannelTitle');
  if (channelDisplay) channelDisplay.textContent = `INSAT-3D Channel: ${channelName}`;
}

function simulateCycloneUpload() {
  const previewBox = document.getElementById('cyclonePreviewBox');
  if (previewBox) previewBox.classList.remove('hidden');
}

/* Bulletin Generator */
function exportCycloneBulletin(format) {
  const cyclone = window.CycloneState.activeCyclone || CYCLONES.biparjoy;
  const bulletinNo = `RSMC/TROPICAL_CYCLONE_BULLETIN_${Date.now().toString().slice(-6)}`;

  if (format === 'pdf') {
    alert(`[RSMC New Delhi Official Bulletin Generator]\n\nHeader: ${bulletinNo}\nStorm: ${cyclone.name}\nCategory: ${cyclone.category} (${cyclone.tNumber})\nMax Wind: ${cyclone.vmax} knots (${cyclone.vmaxKmph} km/h)\nCentral Pressure: ${cyclone.pmin} hPa\nLandfall Target: ${cyclone.landfallLocation}\n\nGenerating Official IMD / WMO Bulletin PDF...`);
  } else if (format === 'json') {
    const jsonContent = JSON.stringify(cyclone, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IMD_RSMC_${cyclone.name.replace(/\s+/g, '_')}.json`;
    a.click();
  }
}
