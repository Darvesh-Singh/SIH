/* ==========================================================================
   CycloneTrack AI - 3D Tropical Cyclone WebGL Visualizer (Three.js)
   ========================================================================== */

let cyclone3DScene, cyclone3DCamera, cyclone3DRenderer;
let stormVortexMesh, cloudTopMesh, eyeWallRingMesh;
let cloudSliceY = 2.5;

function initCyclone3DEngine() {
  const container = document.getElementById('canvasCyclone3DContainer');
  if (!container) return;

  container.innerHTML = '';

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 350;

  // Scene & Camera
  cyclone3DScene = new THREE.Scene();
  cyclone3DScene.fog = new THREE.FogExp2(0x020617, 0.04);

  cyclone3DCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  cyclone3DCamera.position.set(0, 14, 18);
  cyclone3DCamera.lookAt(0, 0, 0);

  // WebGL Renderer
  cyclone3DRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  cyclone3DRenderer.setSize(width, height);
  cyclone3DRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(cyclone3DRenderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  cyclone3DScene.add(ambientLight);

  const eyeSpotLight = new THREE.PointLight(0xef4444, 3, 25);
  eyeSpotLight.position.set(0, 2, 0); // Red glow inside central eye core
  cyclone3DScene.add(eyeSpotLight);

  const cyanLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
  cyanLight.position.set(10, 15, 10);
  cyclone3DScene.add(cyanLight);

  // 1. Create Cyclone Eye Wall Cone Mesh (Stadium Effect)
  const coneGeometry = new THREE.CylinderGeometry(5.5, 1.2, 4, 32, 16, true);
  
  const vortexShaderMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      uniform float uTime;
      void main() {
        // Radius distance from center eye
        float dist = length(vPosition.xz);
        
        // Temperature Color Gradient: Cold Cloud Tops (-80°C Purple/Red) vs Warm Eye
        vec3 eyeWarm = vec3(0.96, 0.62, 0.04); // #f59e0b
        vec3 eyeWallRed = vec3(0.93, 0.27, 0.27); // #ef4444
        vec3 coldCloudTop = vec3(0.66, 0.33, 0.97); // #a855f7
        vec3 outerSpiral = vec3(0.22, 0.74, 0.97); // #38bdf8

        vec3 color;
        if (dist < 1.8) {
          color = mix(eyeWarm, eyeWallRed, dist / 1.8);
        } else if (dist < 3.8) {
          color = mix(eyeWallRed, coldCloudTop, (dist - 1.8) / 2.0);
        } else {
          color = mix(coldCloudTop, outerSpiral, (dist - 3.8) / 1.7);
        }

        gl_FragColor = vec4(color, 0.75);
      }
    `,
    uniforms: {
      uTime: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide,
    wireframe: true
  });

  stormVortexMesh = new THREE.Mesh(coneGeometry, vortexShaderMat);
  stormVortexMesh.position.y = 1.0;
  cyclone3DScene.add(stormVortexMesh);

  // 2. Spiraling Rainband Particles
  const particleCount = 300;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 5.0;
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
    particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xef4444,
    size: 0.12,
    transparent: true,
    opacity: 0.8
  });
  const spiralParticles = new THREE.Points(particleGeo, particleMat);
  stormVortexMesh.add(spiralParticles);

  // 3. Eye Wall Ring Marker Plane
  const ringGeo = new THREE.RingGeometry(1.2, 1.4, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
  eyeWallRingMesh = new THREE.Mesh(ringGeo, ringMat);
  eyeWallRingMesh.rotation.x = Math.PI / 2;
  eyeWallRingMesh.position.y = 2.0;
  cyclone3DScene.add(eyeWallRingMesh);

  window.addEventListener('resize', onWindowResizeCyclone3D);
  animateCyclone3D();
}

function set3DCloudAltitude(altitudeKm) {
  cloudSliceY = (altitudeKm / 18.0) * 4.0;
  if (eyeWallRingMesh) {
    eyeWallRingMesh.position.y = cloudSliceY - 1.0;
  }

  // Calculate cloud-top temperature (°C) based on tropospheric lapse rate
  const cloudTempC = (15.0 - (altitudeKm * 6.5)).toFixed(1);
  const windShearKts = (8 + (altitudeKm * 1.2)).toFixed(1);

  const altText = document.getElementById('probeAltitudeText');
  const tempText = document.getElementById('probeCloudTempText');
  const shearText = document.getElementById('probeShearText');

  if (altText) altText.textContent = `${altitudeKm} km`;
  if (tempText) tempText.textContent = `${cloudTempC} °C`;
  if (shearText) shearText.textContent = `${windShearKts} kts`;
}

function animateCyclone3D() {
  requestAnimationFrame(animateCyclone3D);

  if (stormVortexMesh) {
    stormVortexMesh.rotation.y += 0.015; // Cyclonic counter-clockwise rotation (Northern Hemisphere)
  }

  if (cyclone3DRenderer && cyclone3DScene && cyclone3DCamera) {
    cyclone3DRenderer.render(cyclone3DScene, cyclone3DCamera);
  }
}

function onWindowResizeCyclone3D() {
  const container = document.getElementById('canvasCyclone3DContainer');
  if (!container || !cyclone3DRenderer || !cyclone3DCamera) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  cyclone3DCamera.aspect = width / height;
  cyclone3DCamera.updateProjectionMatrix();
  cyclone3DRenderer.setSize(width, height);
}
