/* ==========================================================================
   OceanEmbed AI - Scientific Oceanographic Charting Engine (Chart.js)
   ========================================================================== */

let verticalDepthChartInstance = null;
let soundVelocityChartInstance = null;
let errorChartInstance = null;

// Scientific Depth Profile Dataset (Depths: 0m, 50m, 100m, 150m, 200m, 300m, 500m, 750m, 1000m)
const PROFILE_DATA = {
  depths: [0, 50, 100, 150, 200, 300, 500, 750, 1000],
  // Baseline dataset for Arabian Sea Sector
  arabianSea: {
    predicted: [29.5, 28.1, 24.2, 18.2, 14.5, 11.2, 7.8, 5.4, 4.1],
    argoTruth:  [29.8, 27.9, 24.0, 18.1, 14.6, 11.0, 7.7, 5.5, 4.0]
  },
  bayOfBengal: {
    predicted: [30.2, 29.0, 25.4, 19.8, 15.2, 12.0, 8.2, 5.8, 4.3],
    argoTruth:  [30.4, 28.8, 25.1, 19.9, 15.0, 12.1, 8.3, 5.7, 4.2]
  },
  centralIndianOcean: {
    predicted: [28.2, 27.0, 22.8, 16.5, 13.1, 10.1, 6.9, 4.9, 3.8],
    argoTruth:  [28.0, 27.2, 22.9, 16.4, 13.3, 10.0, 7.0, 4.8, 3.9]
  }
};

function renderVerticalDepthChart(datasetKey = 'arabianSea') {
  const ctx = document.getElementById('depthChart');
  if (!ctx) return;

  const currentData = PROFILE_DATA[datasetKey] || PROFILE_DATA.arabianSea;

  if (verticalDepthChartInstance) {
    verticalDepthChartInstance.destroy();
  }

  // Oceanographic standard: Depth on Y-axis (Inverted: 0m at top, 1000m at bottom), Temp on X-axis
  verticalDepthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: currentData.predicted.map((t, idx) => t), // X-axis values
      datasets: [
        {
          label: 'AI Neural Operator FNO Prediction (°C)',
          data: currentData.predicted.map((t, idx) => ({ x: t, y: PROFILE_DATA.depths[idx] })),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#38bdf8'
        },
        {
          label: 'In-Situ ARGO Float #29014 Ground Truth (°C)',
          data: currentData.argoTruth.map((t, idx) => ({ x: t, y: PROFILE_DATA.depths[idx] })),
          borderColor: '#10b981',
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 5,
          pointStyle: 'rectRot',
          pointBackgroundColor: '#10b981'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#cbd5e1',
            font: { family: 'Inter', size: 11, weight: '500' },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(2, 6, 23, 0.95)',
          titleColor: '#38bdf8',
          borderColor: 'rgba(56, 189, 248, 0.3)',
          borderWidth: 1,
          callbacks: {
            title: function(context) {
              return `Ocean Depth: ${context[0].raw.y} meters`;
            },
            label: function(context) {
              return `${context.dataset.label}: ${context.raw.x.toFixed(1)} °C`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Temperature (°C)',
            color: '#94a3b8',
            font: { family: 'Inter', size: 11, weight: '600' }
          },
          grid: { color: 'rgba(30, 41, 59, 0.6)' },
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
          min: 0,
          max: 35
        },
        y: {
          type: 'linear',
          reverse: true, // Invert Y-axis so 0m is at top!
          title: {
            display: true,
            text: 'Subsurface Depth (Meters)',
            color: '#94a3b8',
            font: { family: 'Inter', size: 11, weight: '600' }
          },
          grid: { color: 'rgba(30, 41, 59, 0.6)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'JetBrains Mono', size: 10 },
            stepSize: 100,
            callback: function(val) { return val + 'm'; }
          },
          min: 0,
          max: 1000
        }
      }
    }
  });
}

// Sound Velocity Profile (SVP) for Naval Submarine Command
function renderSoundVelocityChart(datasetKey = 'arabianSea') {
  const ctx = document.getElementById('svpChart');
  if (!ctx) return;

  const currentData = PROFILE_DATA[datasetKey] || PROFILE_DATA.arabianSea;
  
  // Calculate Sound Velocity (m/s) using Medwin Formula: C = 1449.2 + 4.6T - 0.055T^2 + 0.00029T^3 + 0.016z
  const soundSpeeds = currentData.predicted.map((t, idx) => {
    const z = PROFILE_DATA.depths[idx];
    const c = 1449.2 + (4.6 * t) - (0.055 * t * t) + (0.00029 * Math.pow(t, 3)) + (0.016 * z);
    return { x: parseFloat(c.toFixed(1)), y: z };
  });

  if (soundVelocityChartInstance) {
    soundVelocityChartInstance.destroy();
  }

  soundVelocityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Acoustic Sound Velocity Profile C(z) [m/s]',
        data: soundSpeeds,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#f59e0b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#cbd5e1', font: { size: 10 } } },
        tooltip: {
          callbacks: {
            title: (ctx) => `Depth: ${ctx[0].raw.y}m`,
            label: (ctx) => `Speed of Sound: ${ctx.raw.x} m/s`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: { display: true, text: 'Sound Speed (m/s)', color: '#94a3b8' },
          grid: { color: 'rgba(30, 41, 59, 0.6)' },
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          type: 'linear',
          reverse: true, // 0m surface at top
          title: { display: true, text: 'Depth (m)', color: '#94a3b8' },
          grid: { color: 'rgba(30, 41, 59, 0.6)' },
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
          min: 0,
          max: 1000
        }
      }
    }
  });
}
