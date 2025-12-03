// gate1_breath_wall.js
// Te Kuaha Whakaata — Mirror Gate (global THREE version)

(function () {
  if (typeof THREE === "undefined") {
    console.warn("Mirror Gate: THREE.js not found on window.");
    return;
  }

  const canvas = document.getElementById("gate1-breath-canvas");
  if (!canvas) {
    console.warn("Mirror Gate: canvas #gate1-breath-canvas not found.");
    return;
  }

  let width = canvas.clientWidth || 800;
  let height = canvas.clientHeight || 450;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 10);
  camera.position.set(0, 0, 1.6);

  const geometry = new THREE.PlaneGeometry(2, 1.125, 200, 112); // 16:9-ish

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uDisturbance: { value: 0.0 },
    uSettleFactor: { value: 0.0 },
  };

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;

    varying vec2 vUv;

    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uDisturbance;
    uniform float uSettleFactor;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float mataoraMask(vec2 uv) {
      vec2 p = (uv - 0.5) * vec2(1.4, 2.0);

      float face = smoothstep(0.9, 0.2, length(p));

      float manawa = smoothstep(0.02, 0.0, abs(p.x));

      float cheekLeft  = smoothstep(0.03, 0.0, abs(p.y + 0.2) - (0.3 + 0.15 * sin(p.y * 5.0)));
      float cheekRight = smoothstep(0.03, 0.0, abs(p.y + 0.2) - (0.3 + 0.15 * sin(-p.y * 5.0)));

      vec2 eyeL = p + vec2(0.4, 0.3);
      vec2 eyeR = p + vec2(-0.4, 0.3);
      float eyeMaskL = smoothstep(0.08, 0.05, length(eyeL));
      float eyeMaskR = smoothstep(0.08, 0.05, length(eyeR));

      float mataora = 0.0;
      mataora += manawa * 0.9;
      mataora += cheekLeft * 0.7;
      mataora += cheekRight * 0.7;
      mataora += eyeMaskL * 0.8;
      mataora += eyeMaskR * 0.8;

      mataora *= face;
      return clamp(mataora, 0.0, 1.0);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.3;

      float breath = sin(t * 0.7) * 0.15;

      vec2 toPointer = uv - uPointer;
      float dist = length(toPointer);
      float ripple = 0.0;
      if (uDisturbance > 0.01) {
        float wave = sin(20.0 * dist - t * 6.0);
        float falloff = exp(-10.0 * dist);
        ripple = wave * falloff * uDisturbance * 0.4;
      }

      float n = noise(uv * 8.0 + vec2(t * 0.5, -t * 0.3)) * 0.06;

      float height = breath + ripple + n;

      vec2 eps = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);
      float hR = breath + ripple + noise((uv + vec2(eps.x, 0.0)) * 8.0 + vec2(t * 0.5, -t * 0.3));
      float hU = breath + ripple + noise((uv + vec2(0.0, eps.y)) * 8.0 + vec2(t * 0.5, -t * 0.3));
      vec3 nrm = normalize(vec3(hR - height, hU - height, 1.0));

      vec3 deep = vec3(0.02, 0.04, 0.06);
      vec3 sky = vec3(0.18, 0.22, 0.30);

      float ndotl = clamp(dot(nrm, normalize(vec3(0.2, 0.4, 1.0))), 0.0, 1.0);
      float fres = pow(1.0 - nrm.z, 3.0);

      vec3 baseCol = mix(deep, sky, ndotl * 0.6 + fres * 0.4);

      float disturbanceGlow = uDisturbance * 0.35;
      baseCol += disturbanceGlow * vec3(0.1, 0.14, 0.18);

      float revealRaw = 1.0 - clamp(uDisturbance * 1.2, 0.0, 1.0);
      float revealTime = smoothstep(0.4, 0.9, uSettleFactor);
      float reveal = revealRaw * revealTime;

      float mask = mataoraMask(uv);
      float mataoraStrength = reveal * mask;

      vec3 mataoraCol = vec3(0.92, 0.92, 0.88) + vec3(0.12, 0.18, 0.28) * 0.4;

      vec3 colour = baseCol;
      colour = mix(colour, colour + mataoraCol * 0.5, mataoraStrength);
      colour += mataoraStrength * 0.15;

      vec2 d = uv - 0.5;
      float vignette = smoothstep(0.9, 0.2, length(d));
      colour *= vignette;

      gl_FragColor = vec4(colour, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    uniforms.uPointer.value.set(x, 1.0 - y);
    uniforms.uDisturbance.value = Math.min(
      1.0,
      uniforms.uDisturbance.value + 0.2
    );
    uniforms.uSettleFactor.value = Math.max(
      0.0,
      uniforms.uSettleFactor.value - 0.15
    );
  }

  canvas.addEventListener("pointermove", setPointerFromEvent);
  canvas.addEventListener("pointerdown", setPointerFromEvent);
  canvas.addEventListener("pointerenter", setPointerFromEvent);

  function onResize() {
    const newWidth = canvas.clientWidth || width;
    const newHeight = canvas.clientHeight || height;

    if (newWidth === width && newHeight === height) return;

    width = newWidth;
    height = newHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.uResolution.value.set(width, height);
  }

  window.addEventListener("resize", onResize);

  let lastTime = performance.now();
  let revealed = false;

  function animate(now) {
    requestAnimationFrame(animate);

    const deltaMs = now - lastTime;
    const delta = deltaMs / 1000.0;
    lastTime = now;

    uniforms.uTime.value += delta;

    const decayRate = 0.25;
    uniforms.uDisturbance.value = Math.max(
      0.0,
      uniforms.uDisturbance.value - decayRate * delta
    );

    if (uniforms.uDisturbance.value < 0.15) {
      const settleSpeed = 0.15;
      uniforms.uSettleFactor.value = Math.min(
        1.0,
        uniforms.uSettleFactor.value + settleSpeed * delta
      );
    } else {
      const resetSpeed = 0.5;
      uniforms.uSettleFactor.value = Math.max(
        0.0,
        uniforms.uSettleFactor.value - resetSpeed * delta
      );
    }

    if (!revealed && uniforms.uSettleFactor.value > 0.85) {
      revealed = true;
      document.body.classList.add("mirror-revealed");
    }

    renderer.render(scene, camera);
  }

  animate(performance.now());
})();
