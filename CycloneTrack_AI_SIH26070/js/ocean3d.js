/* ==========================================================================
   OceanEmbed AI - 3D Subsurface WebGL Engine (Three.js)
   ========================================================================== */

let ocean3DScene, ocean3DCamera, ocean3DRenderer;
let depthSlicePlane, thermoclineMesh, particlesMesh;
let targetDepth = 150; // default 150m depth slice
let oceanCubeMesh;

function initOcean3DEngine() {
  const container = document.getElementById('canvas3DContainer');
  if (!container) return;

  // Clear previous canvas if exists
  container.innerHTML = '';

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 350;

  // Scene setup
  ocean3DScene = new THREE.Scene();
  ocean3DScene.fog = new THREE.FogExp2(0x020617, 0.05);

  // Camera setup
  ocean3DCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  ocean3DCamera.position.set(12, 10, 15);
  ocean3DCamera.lookAt(0, 0, 0);

  // WebGL Renderer with antialiasing & transparency
  ocean3DRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  ocean3DRenderer.setSize(width, height);
  ocean3DRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(ocean3DRenderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  ocean3DScene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
  dirLight.position.set(10, 20, 10);
  ocean3DScene.add(dirLight);

  const bluePointLight = new THREE.PointLight(0x3b82f6, 2, 20);
  bluePointLight.position.set(0, -3, 0);
  ocean3DScene.add(bluePointLight);

  // 1. Create Ocean Cube Block (Representing 0m to 1000m volume)
  const boxGeometry = new THREE.BoxGeometry(6, 8, 6, 16, 32, 16);
  
  // Custom Shader/Gradient Material for Ocean Depth
  const vertexShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uSliceY;
    
    void main() {
      // Normalized depth from top (+4.0) to bottom (-4.0)
      float normDepth = (4.0 - vPosition.y) / 8.0; 
      
      // Temperature Gradient Colors
      vec3 surfaceWarm = vec3(0.93, 0.27, 0.27); // #ef4444 Red (29.5°C)
      vec3 thermocline = vec3(0.96, 0.62, 0.04); // #f59e0b Yellow (18.2°C)
      vec3 midDepth = vec3(0.06, 0.72, 0.51);    // #10b981 Emerald
      vec3 deepAbyssal = vec3(0.07, 0.11, 0.29); // #121c4a Deep Blue (4.1°C)
      
      vec3 color;
      if (normDepth < 0.15) {
        color = mix(surfaceWarm, thermocline, normDepth / 0.15);
      } else if (normDepth < 0.4) {
        color = mix(thermocline, midDepth, (normDepth - 0.15) / 0.25);
      } else {
        color = mix(midDepth, deepAbyssal, (normDepth - 0.4) / 0.6);
      }

      // Highlight active depth slice plane
      float sliceDistance = abs(vPosition.y - uSliceY);
      if (sliceDistance < 0.12) {
        color = mix(color, vec3(1.0, 1.0, 1.0), 0.8);
      }

      // Wireframe / Grid shading effect
      float alpha = 0.85;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const oceanMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      uSliceY: { value: 2.8 } // Default slice near top surface
    },
    transparent: true,
    side: THREE.DoubleSide
  });

  oceanCubeMesh = new THREE.Mesh(boxGeometry, oceanMaterial);
  ocean3DScene.add(oceanCubeMesh);

  // Wireframe outline for high-tech look
  const wireframeGeo = new THREE.WireframeGeometry(boxGeometry);
  const wireframeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 });
  const wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat);
  oceanCubeMesh.add(wireframeMesh);

  // 2. Interactive Slice Plane (Glowing horizontal slice disk)
  const sliceGeo = new THREE.PlaneGeometry(6.4, 6.4);
  const sliceMat = new THREE.MeshBasicMaterial({ 
    color: 0x00f0ff, 
    side: THREE.DoubleSide, 
    transparent: true, 
    opacity: 0.65 
  });
  depthSlicePlane = new THREE.Mesh(sliceGeo, sliceMat);
  depthSlicePlane.rotation.x = Math.PI / 2;
  depthSlicePlane.position.y = 2.8;
  ocean3DScene.add(depthSlicePlane);

  // 3. Thermocline Isosurface Mesh (Wavy surface at ~150m depth)
  const thermoGeo = new THREE.PlaneGeometry(6, 6, 24, 24);
  const thermoMat = new THREE.MeshStandardMaterial({ 
    color: 0xf59e0b, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.45 
  });
  thermoclineMesh = new THREE.Mesh(thermoGeo, thermoMat);
  thermoclineMesh.rotation.x = Math.PI / 2;
  thermoclineMesh.position.y = 1.8; // ~150m depth position
  ocean3DScene.add(thermoclineMesh);

  // 4. Underwater Bio-luminescent Particles
  const particleCount = 150;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 6;
    particlePositions[i + 1] = (Math.random() - 0.5) * 8;
    particlePositions[i + 2] = (Math.random() - 0.5) * 6;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.1,
    transparent: true,
    opacity: 0.6
  });
  particlesMesh = new THREE.Points(particleGeo, particleMat);
  ocean3DScene.add(particlesMesh);

  // Resize handler
  window.addEventListener('resize', onWindowResize3D);

  // Animation Loop
  animateOcean3D();
}

function set3DDepthSlice(depthMeters) {
  targetDepth = depthMeters;
  // Convert 0m..1000m depth to Three.js Y-coordinates (+4.0 to -4.0)
  const sliceY = 4.0 - (depthMeters / 1000.0) * 8.0;

  if (depthSlicePlane) {
    depthSlicePlane.position.y = sliceY;
  }
  if (oceanCubeMesh && oceanCubeMesh.material.uniforms) {
    oceanCubeMesh.material.uniforms.uSliceY.value = sliceY;
  }

  // Calculate simulated temperature & density at target depth
  let temp = 29.5;
  if (depthMeters <= 50) {
    temp = 29.5 - (depthMeters / 50) * 1.5;
  } else if (depthMeters <= 250) {
    temp = 28.0 - ((depthMeters - 50) / 200) * 10.0;
  } else if (depthMeters <= 600) {
    temp = 18.0 - ((depthMeters - 250) / 350) * 9.5;
  } else {
    temp = 8.5 - ((depthMeters - 600) / 400) * 4.4;
  }
  temp = Math.max(3.8, temp);

  // Sound speed (m/s) calculation using Wilson's / Medwin's equation
  const soundSpeed = (1449.2 + 4.6 * temp - 0.055 * temp * temp + 0.00029 * Math.pow(temp, 3) + (1.34 - 0.01 * temp) * 0.2 + 0.016 * depthMeters).toFixed(1);

  // Update probe overlay UI text
  const depthText = document.getElementById('probeDepthText');
  const tempText = document.getElementById('probeTempText');
  const speedText = document.getElementById('probeSpeedText');

  if (depthText) depthText.textContent = `${depthMeters} m`;
  if (tempText) tempText.textContent = `${temp.toFixed(1)} °C`;
  if (speedText) speedText.textContent = `${soundSpeed} m/s`;
}

function animateOcean3D() {
  requestAnimationFrame(animateOcean3D);

  if (oceanCubeMesh) {
    oceanCubeMesh.rotation.y += 0.003; // Gentle ambient rotation
  }

  // Animate thermocline wave vertices
  if (thermoclineMesh) {
    const time = Date.now() * 0.002;
    const pos = thermoclineMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      const z = Math.sin(u * 2 + time) * 0.1 + Math.cos(v * 2 + time) * 0.1;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  }

  if (ocean3DRenderer && ocean3DScene && ocean3DCamera) {
    ocean3DRenderer.render(ocean3DScene, ocean3DCamera);
  }
}

function onWindowResize3D() {
  const container = document.getElementById('canvas3DContainer');
  if (!container || !ocean3DRenderer || !ocean3DCamera) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  ocean3DCamera.aspect = width / height;
  ocean3DCamera.updateProjectionMatrix();
  ocean3DRenderer.setSize(width, height);
}
