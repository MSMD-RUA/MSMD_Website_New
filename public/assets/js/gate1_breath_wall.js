// Gate 1 — Two Oceans Wall (dialled up, fixed)
// - Inner lake (engine) = calm but clearly shaped in motion only
// - Outer ocean (manuhiri) = strong hover/click ripples
// - Lake mask from puhoro_lake_mask_v1.png = boundary band

import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

(function () {
  const canvas = document.getElementById('gate1-breath-canvas');
  if (!canvas) {
    console.warn('gate1_breath_wall.js: #gate1-breath-canvas not found');
    return;
  }

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Scene & Camera
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    30,
    1, // updated on resize
    0.1,
    10
  );
  camera.position.z = 2.4;
  scene.add(camera);

  // Higher-res plane geometry to kill “steps”
  const geometry = new THREE.PlaneGeometry(2, 1, 256, 128);

  // --- Two-ocean lake mask texture ----------------------------------

  const lakeMask = new THREE.TextureLoader().load(
    'assets/textures/puhoro_lake_mask_v1.png'
  );
  lakeMask.wrapS = THREE.ClampToEdgeWrapping;
  lakeMask.wrapT = THREE.ClampToEdgeWrapping;
  lakeMask.minFilter = THREE.LinearFilter;
  lakeMask.magFilter = THREE.LinearFilter;
  lakeMask.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Uniforms
  const uniforms = {
    u_time:         { value: 0 },
    u_tideAmp:      { value: 0.06 }, // softer tide

    u_rippleAmp:    { value: 0.20 }, // base ripple amp (we mod it on events)
    u_rippleCenter: { value: new THREE.Vector2(0.5, 0.5) },
    u_rippleStart:  { value: 0.0 },

    u_tension:      { value: 0.0 },  // 0 = soft, 1 = hard boundary

    u_colorDeep:    { value: new THREE.Color(0x020617) },
    u_colorMid:     { value: new THREE.Color(0x0ea5e9) },
    u_colorFoam:    { value: new THREE.Color(0x38bdf8) },

    u_skyColor:     { value: new THREE.Color(0x020617) },

    u_lakeMask:     { value: lakeMask },
  };

  // Vertex shader
  const vertexShader = /* glsl */`
    precision mediump float;

    uniform float u_time;
    uniform float u_tideAmp;
    uniform float u_rippleAmp;
    uniform vec2  u_rippleCenter;
    uniform float u_rippleStart;

    uniform sampler2D u_lakeMask;
    uniform float u_tension;

    varying vec2 vUv;
    varying float vHeight;

    void main() {
      vUv = uv;

      // Pin near the outer frame
      vec2 centre = vec2(0.5, 0.5);
      float distCentre = distance(uv, centre);
      float edgeMask = 1.0 - smoothstep(0.0, 0.75, distCentre);

      // --- Lake mask sampling (blurred) ---
      float texelX = 1.0 / 1024.0;
      float texelY = 1.0 / 512.0;

      float m0 = texture2D(u_lakeMask, vUv).r;
      float m1 = texture2D(u_lakeMask, vUv + vec2( texelX, 0.0)).r;
      float m2 = texture2D(u_lakeMask, vUv + vec2(-texelX, 0.0)).r;
      float m3 = texture2D(u_lakeMask, vUv + vec2(0.0,  texelY)).r;
      float m4 = texture2D(u_lakeMask, vUv + vec2(0.0, -texelY)).r;
      float m5 = texture2D(u_lakeMask, vUv + vec2( texelX,  texelY)).r;
      float m6 = texture2D(u_lakeMask, vUv + vec2(-texelX,  texelY)).r;
      float m7 = texture2D(u_lakeMask, vUv + vec2( texelX, -texelY)).r;
      float m8 = texture2D(u_lakeMask, vUv + vec2(-texelX, -texelY)).r;

      float lakeValRaw = (m0 + m1 + m2 + m3 + m4 + m5 + m6 + m7 + m8) / 9.0;

      // Inner = white, outer = black
      float innerMask = smoothstep(0.25, 0.9, lakeValRaw);
      float outerMask = 1.0 - innerMask;

      // Boundary where the two oceans meet
      float boundaryMask = smoothstep(0.40, 0.60, lakeValRaw);

      // --- Engine tide + swell (everywhere) ---
      float tTide  = u_time * 0.35;
      float tide   = sin(tTide) * u_tideAmp;

      float tSwell = u_time * 0.18;
      float swell  = sin((uv.x * 6.28318) + tSwell) * (u_tideAmp * 0.8);

      // Base engine height — inner/outer the SAME at rest
      float engineHeight = tide + swell;
      float lakeShape = 0.0;
      engineHeight += lakeShape;

      // --- Ripple from manuhiri input ---
      float ripple = 0.0;
      if (u_rippleStart > 0.0) {
        float t = max(u_time - u_rippleStart, 0.0);
        float d = distance(uv, u_rippleCenter);

        // higher frequency and speed so you really see it
        float wave = sin(16.0 * d - 6.0 * t);
        float timeEnvelope  = exp(-0.25 * t);
        float spaceEnvelope = 1.0 - smoothstep(0.0, 1.4, d);

        ripple = wave * timeEnvelope * spaceEnvelope;
      }

      // Outer ocean ripples: big and obvious
      float outerRipple = ripple * u_rippleAmp * outerMask * 1.6;

      // Inner lake ripples: softer, and blocked when tension high
      float block = mix(0.0, 1.0, boundaryMask * u_tension);
      float innerPass = 1.0 - block;
      float innerRipple = ripple * u_rippleAmp * innerMask * innerPass * 0.9;

      // --- Standing wave along boundary when tension is high ---
      float boundaryWave = 0.0;
      if (u_tension > 0.02) {
        float t = u_time * 3.5;
        float lineWave = sin((vUv.x * 12.0) - t);
        float envelope = boundaryMask;
        float centerFalloff = 1.0 - smoothstep(0.3, 0.7, vUv.x);
        // line "rings" strongest near centre of x
        boundaryWave = lineWave * envelope * centerFalloff * 0.08 * u_tension;
      }

      float height = (engineHeight + outerRipple + innerRipple + boundaryWave) * edgeMask;

      vHeight = height;
      vec3 displaced = position + normal * height;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `;

  // Fragment shader
  const fragmentShader = /* glsl */`
    precision mediump float;

    uniform vec3 u_colorDeep;
    uniform vec3 u_colorMid;
    uniform vec3 u_colorFoam;
    uniform vec3 u_skyColor;

    varying vec2 vUv;
    varying float vHeight;

    void main() {
      float h = clamp((vHeight + 0.20) / 0.40, 0.0, 1.0);

      vec3 deepToMid = mix(u_colorDeep, u_colorMid, smoothstep(0.0, 0.6, h));
      vec3 waterColor = mix(deepToMid, u_colorFoam, smoothstep(0.6, 1.0, h));

      float edge = distance(vUv, vec2(0.5, 0.5));
      float fresnel = smoothstep(0.2, 0.9, edge);
      vec3 reflected = mix(waterColor, u_skyColor, fresnel * 0.6);

      // Subtle horizontal "sun" highlight band
      float highlight = smoothstep(0.45, 0.55, vUv.y);
      highlight *= smoothstep(0.0, 0.12, abs(vHeight)); // mainly on gentle slopes
      vec3 sun = vec3(1.0, 1.0, 1.0);

      vec3 color = mix(reflected, sun, highlight * 0.08);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  });

  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  const clock = new THREE.Clock();
  let accumulatedTime = 0;

  // -------- Interaction: stone vs wind, tension control --------

  function setRippleFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;

    uniforms.u_rippleCenter.value.set(x, 1.0 - y);
    uniforms.u_rippleStart.value = accumulatedTime;
  }

  // Stone drop: big ripple + hard boundary
  function triggerStoneDrop(ev) {
    setRippleFromEvent(ev);
    uniforms.u_rippleAmp.value = 0.22;
    uniforms.u_tension.value = 1.0;
  }

  // Wind: medium ripple + medium tension, from hover
  let lastGustTime = 0;
  const GUST_INTERVAL = 0.03;

  function triggerWindGust(ev) {
    if (ev.buttons !== 0) return;

    const now = accumulatedTime;
    if (now - lastGustTime < GUST_INTERVAL) return;
    lastGustTime = now;

    setRippleFromEvent(ev);
    uniforms.u_rippleAmp.value = 0.14;
    uniforms.u_tension.value = Math.max(uniforms.u_tension.value, 0.4);
  }

  canvas.addEventListener('pointerdown', triggerStoneDrop);
  canvas.addEventListener('pointermove', triggerWindGust);

  canvas.addEventListener('pointerup',    () => {});
  canvas.addEventListener('pointerleave', () => {});

  // -------- Resize + render loop -------------------------------

  function resizeRendererToDisplaySize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight || (width * 0.5);
    if (width === 0 || height === 0) return;

    const pixelRatio = renderer.getPixelRatio();
    const needResize =
      canvas.width  !== width  * pixelRatio ||
      canvas.height !== height * pixelRatio;

    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function render() {
    const dt = clock.getDelta();
    accumulatedTime += dt;
    uniforms.u_time.value = accumulatedTime;

    // Relax tension back to soft over time
    if (uniforms.u_tension.value > 0.0) {
      uniforms.u_tension.value = Math.max(
        0.0,
        uniforms.u_tension.value - dt * 0.18  // a bit quicker relax
      );
    }

    resizeRendererToDisplaySize();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resizeRendererToDisplaySize);
  resizeRendererToDisplaySize();
  render();
})();
