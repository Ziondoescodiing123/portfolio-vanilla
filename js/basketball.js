/**
 * Premium interactive 3D basketball — authentic seams, PBR leather, drag to spin.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const SIZE = 1024;
const BALL_RADIUS = 1.15;
const SEAM_RADIUS = 0.015;
const SEAM_A = 0.44;

/** Authentic curved panel seam (Paul Bourke / Wilson-style basketball curve). */
function tennisBallSeamPoints(a = SEAM_A, segments = 512) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 4;
    const phi = Math.PI / 2 - (Math.PI / 2 - a) * Math.cos(t);
    const theta = t / 2 + a * Math.sin(2 * t);
    pts.push(
      new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ),
    );
  }
  return pts;
}

function equatorPoints(radius, segments = 256) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  return pts;
}

function createSeamTube(points, material) {
  const curve = new THREE.CatmullRomCurve3(points, true);
  const geometry = new THREE.TubeGeometry(curve, 320, SEAM_RADIUS, 12, true);
  return new THREE.Mesh(geometry, material);
}

function createBasketballSeams(seamMaterial) {
  const group = new THREE.Group();
  const surface = BALL_RADIUS + 0.003;
  const yAxis = new THREE.Vector3(0, 1, 0);

  const curvedA = tennisBallSeamPoints().map((p) => p.clone().multiplyScalar(surface));
  const curvedB = tennisBallSeamPoints().map((p) =>
    p.clone().applyAxisAngle(yAxis, Math.PI).multiplyScalar(surface),
  );

  group.add(createSeamTube(equatorPoints(surface), seamMaterial));
  group.add(createSeamTube(curvedA, seamMaterial));
  group.add(createSeamTube(curvedB, seamMaterial));

  return group;
}

function smoothHeightField(heights, size, passes = 2) {
  const temp = new Float32Array(heights.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            sum += heights[ny * size + nx];
            count++;
          }
        }
        temp[y * size + x] = sum / count;
      }
    }
    heights.set(temp);
  }
}

function buildHeightField(size) {
  const heights = new Float32Array(size * size);
  const base = 0.56;

  heights.fill(base);

  const spacing = 7;
  for (let row = 0; row < size; row += spacing) {
    const rowOffset = ((row / spacing) | 0) % 2 ? spacing * 0.5 : 0;
    for (let col = 0; col < size; col += spacing) {
      const x = col + rowOffset + (Math.random() - 0.5) * 1.2;
      const y = row + (Math.random() - 0.5) * 1.2;
      const bump = 0.7 + Math.random() * 0.12;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = Math.floor(x) + dx;
          const ny = Math.floor(y) + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const dist = Math.hypot(dx, dy);
          if (dist > 2.5) continue;
          const ni = ny * size + nx;
          const falloff = 1 - dist / 2.8;
          heights[ni] = Math.max(heights[ni], base + (bump - base) * falloff * falloff);
        }
      }
    }
  }

  smoothHeightField(heights, size, 2);
  return heights;
}

function heightToNormalMap(heights, size, strength = 1.85) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const out = img.data;

  for (let i = 0; i < out.length; i += 4) {
    out[i] = 128;
    out[i + 1] = 128;
    out[i + 2] = 255;
    out[i + 3] = 255;
  }

  const sample = (x, y) => heights[Math.max(0, Math.min(size - 1, y)) * size + Math.max(0, Math.min(size - 1, x))];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = sample(x - 1, y) - sample(x + 1, y);
      const dy = sample(x, y - 1) - sample(x, y + 1);
      const nx = dx * strength;
      const ny = dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      out[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function createLeatherMaps() {
  const heights = buildHeightField(SIZE);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = SIZE;
  colorCanvas.height = SIZE;
  const ctx = colorCanvas.getContext('2d');

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const grad = ctx.createRadialGradient(cx - SIZE * 0.08, cy - SIZE * 0.1, SIZE * 0.02, cx, cy, SIZE * 0.52);
  grad.addColorStop(0, '#e8752a');
  grad.addColorStop(0.35, '#d1581a');
  grad.addColorStop(0.7, '#b84712');
  grad.addColorStop(1, '#963a0e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const h = heights[y * SIZE + x];
      const pebble = Math.max(0, Math.min(1, (h - 0.56) / 0.24));
      const grain = (Math.random() - 0.5) * 10;
      const r = Math.min(255, Math.max(0, 198 + grain + pebble * 12));
      const g = Math.min(255, Math.max(0, 92 + grain * 0.45 + pebble * 5));
      const b = Math.min(255, Math.max(0, 28 + grain * 0.1));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = SIZE;
  roughCanvas.height = SIZE;
  const roughCtx = roughCanvas.getContext('2d');
  roughCtx.fillStyle = '#b8b8b8';
  roughCtx.fillRect(0, 0, SIZE, SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const h = heights[y * SIZE + x];
      const pebble = Math.max(0, Math.min(1, (h - 0.56) / 0.24));
      const v = Math.floor(172 - pebble * 32 + (Math.random() - 0.5) * 5);
      const clamped = Math.max(128, Math.min(200, v));
      roughCtx.fillStyle = `rgb(${clamped},${clamped},${clamped})`;
      roughCtx.fillRect(x, y, 1, 1);
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(heightToNormalMap(heights, SIZE));
  normalMap.colorSpace = THREE.NoColorSpace;
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;

  return { colorMap, normalMap, roughnessMap };
}

function createStudioEnvironment(pmrem) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0, '#e8f0ff');
  sky.addColorStop(0.35, '#6a7898');
  sky.addColorStop(0.58, '#2a3040');
  sky.addColorStop(1, '#060608');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 2048, 1024);

  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.fillRect(380, 60, 560, 150);
  ctx.fillRect(1150, 80, 420, 130);
  ctx.fillStyle = 'rgba(255,228,200,0.5)';
  ctx.fillRect(60, 380, 340, 200);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  return env;
}

async function loadEnvironment(pmrem) {
  try {
    const { RoomEnvironment } = await import(
      'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js'
    );
    return pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch {
    return createStudioEnvironment(pmrem);
  }
}

function createContactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.5)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.15)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export async function initBasketball(canvas) {
  if (!canvas) return null;

  const wrap = canvas.parentElement;
  if (!wrap) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.06, 4.2);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = await loadEnvironment(pmrem);

  scene.add(new THREE.HemisphereLight(0xfff6ee, 0x201008, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 5;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffd4a8, 0.7);
  fill.position.set(-7, 3, 5);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xa8c8ff, 0.5);
  rim.position.set(-1, 5, -7);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.ShadowMaterial({ opacity: 0.28 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.28;
  floor.receiveShadow = true;
  scene.add(floor);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = -1.27;
  scene.add(contactShadow);

  const { colorMap, normalMap, roughnessMap } = createLeatherMaps();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  [colorMap, normalMap, roughnessMap].forEach((t) => {
    t.anisotropy = aniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
  });

  const ballGroup = new THREE.Group();

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 128, 128),
    new THREE.MeshPhysicalMaterial({
      map: colorMap,
      normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap,
      roughness: 0.84,
      metalness: 0,
      clearcoat: 0.15,
      clearcoatRoughness: 0.78,
      sheen: 0.22,
      sheenRoughness: 0.82,
      sheenColor: new THREE.Color(0xff9955),
      envMap,
      envMapIntensity: 0.8,
    }),
  );
  ball.castShadow = true;
  ballGroup.add(ball);

  const seamMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x080504,
    roughness: 0.48,
    metalness: 0.04,
    clearcoat: 0.12,
    envMap,
    envMapIntensity: 0.2,
  });

  const seams = createBasketballSeams(seamMaterial);
  ballGroup.add(seams);

  ballGroup.rotation.y = THREE.MathUtils.degToRad(18);
  ballGroup.rotation.x = THREE.MathUtils.degToRad(-8);
  scene.add(ballGroup);

  const state = {
    dragging: false,
    lastX: 0,
    lastY: 0,
    velocityX: 0,
    velocityY: 0,
    autoSpin: 0.003,
  };

  function resize() {
    const w = Math.max(wrap.clientWidth, 1);
    const h = Math.max(wrap.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function onPointerDown(e) {
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.velocityX = 0;
    state.velocityY = 0;
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    ballGroup.rotation.y += dx * 0.012;
    ballGroup.rotation.x += dy * 0.012;
    state.velocityX = dx * 0.012;
    state.velocityY = dy * 0.012;
  }

  function onPointerUp(e) {
    state.dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  resize();
  requestAnimationFrame(resize);
  window.addEventListener('resize', resize);

  let raf = 0;
  function tick() {
    const t = Date.now() * 0.0016;
    if (!state.dragging) {
      ballGroup.rotation.y += state.autoSpin + state.velocityX;
      ballGroup.rotation.x += state.velocityY;
      state.velocityX *= 0.965;
      state.velocityY *= 0.965;
    }
    ballGroup.position.y = Math.sin(t) * 0.04;
    contactShadow.scale.setScalar(1 + Math.sin(t) * 0.04);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    pmrem.dispose();
    envMap.dispose();
    renderer.dispose();
    colorMap.dispose();
    normalMap.dispose();
    roughnessMap.dispose();
    ball.geometry.dispose();
    ball.material.dispose();
    seams.traverse((child) => {
      if (child.isMesh) child.geometry.dispose();
    });
    seamMaterial.dispose();
  };
}

async function boot() {
  const canvas = document.getElementById('basketball-canvas');
  if (!canvas) return;
  try {
    await initBasketball(canvas);
  } catch (err) {
    console.error('Basketball failed to initialize:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
