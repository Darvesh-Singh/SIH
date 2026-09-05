/* ==========================================================================
   CycloneTrack AI - Scientific Intensity & Trajectory Charting Engine
   ========================================================================== */

let intensityChartInstance = null;
let trackErrorChartInstance = null;

const FORECAST_DATA = {
  biparjoy: {
    hours: ['0h (Now)', '+12h', '+24h', '+365h', '+48h', '+60h', '+72h (Landfall)'],
    vmaxAI:   [95, 92, 90, 85, 80, 70, 55],
    vmaxNWP:  [95, 88, 85, 78, 72, 62, 48],
    pminAI:   [968, 969, 970, 973, 976, 980, 985]
  },
  mocha: {
    hours: ['0h (Now)', '+12h', '+24h (Landfall)', '+365h', '+48h'],
    vmaxAI:   [115, 120, 110, 75, 45],
    vmaxNWP:  [115, 112, 102, 65, 38],
    pminAI:   [938, 932, 942, 970, 990]
  },
  amphan: {
    hours: ['0h (Now)', '+12h', '+24h', '+365h', '+48h (Landfall)'],
    vmaxAI:   [140, 132, 120, 105, 85],
    vmaxNWP:  [140, 125, 110, 95, 75],
    pminAI:   [920, 928, 935, 948, 960]
  }
};

function renderIntensityForecastChart(cycloneKey = 'biparjoy') {
  const ctx = document.getElementById('intensityChart');
  if (!ctx) return;

  const data = FORECAST_DATA[cycloneKey] || FORECAST_DATA.biparjoy;

  if (intensityChartInstance) {
    intensityChartInstance.destroy();
  }

  intensityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.hours,
      datasets: [
        {
          label: 'AI Physics-Informed (PINN) Vmax (kts)',
          data: data.vmaxAI,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#ef4444',
          yAxisID: 'y'
        },
        {
          label: 'NWP Ensemble (ECMWF/GFS) Vmax (kts)',
          data: data.vmaxNWP,
          borderColor: '#f59e0b',
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#f59e0b',
          yAxisID: 'y'
        },
        {
          label: 'Estimated Central Pressure Pmin (hPa)',
          data: data.pminAI,
          borderColor: '#38bdf8',
          borderDash: [3, 3],
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#38bdf8',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#cbd5e1', font: { family: 'Inter', size: 11 } }
        },
        tooltip: {
          backgroundColor: 'rgba(2, 6, 23, 0.95)',
          borderColor: 'rgba(239, 68, 68, 0.4)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(30, 41, 59, 0.6)' },
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Max Sustained Wind Speed (Knots)', color: '#ef4444' },
          grid: { color: 'rgba(30, 41, 59, 0.6)' },
          ticks: { color: '#ef4444', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Central Pressure (hPa)', color: '#38bdf8' },
          grid: { drawOnChartArea: false },
          ticks: { color: '#38bdf8', font: { family: 'JetBrains Mono', size: 10 } },
          min: 910,
          max: 1010
        }
      }
    }
  });
}

function renderTrackErrorChart() {
  const ctx = document.getElementById('trackErrorChart');
  if (!ctx) return;

  if (trackErrorChartInstance) {
    trackErrorChartInstance.destroy();
  }

  trackErrorChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['+12 Hours', '+24 Hours', '+48 Hours', '+72 Hours'],
      datasets: [
        {
          label: 'CycloneTrack AI Direct Position Error (km)',
          data: [22, 42, 78, 115],
          backgroundColor: 'rgba(56, 189, 248, 0.7)',
          borderColor: '#38bdf8',
          borderWidth: 1
        },
        {
          label: 'Traditional NWP Model Error (km)',
          data: [48, 85, 145, 210],
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: '#f59e0b',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#cbd5e1', font: { size: 10 } } }
      },
      scales: {
        x: { grid: { color: 'rgba(30, 41, 59, 0.6)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(30, 41, 59, 0.6)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Position Error (km)', color: '#94a3b8' } }
      }
    }
  });
}
