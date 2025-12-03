// GATE 1 LAB — Mirror + ripples + lung-breath + puhoro warp + Mataora calm reveal

(function () {
  const canvas = document.getElementById("mirror-canvas");
  if (!canvas) {
    console.error("Mirror canvas missing");
    return;
  }

  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 10);
  camera.position.set(0, 0, 1.5);

  const geometry = new THREE.PlaneGeometry(2, 1.125, 200, 112);

  const uniforms = {
    uTime:        { value: 0 },
    uPointer:     { value: new THREE.Vector2(0.5, 0.5) },
    uDisturbance: { value: 0.0 },

    uPuhoro:      { value: null },
    uHasPuhoro:   { value: 0.0 },

    uMataora:     { value: null },
    uHasMataora:  { value: 0.0 },

    uCalm:        { value: 0.0 }, // 0 = agitated, 1 = long calm
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
    uniform vec2  uPointer;
    uniform float uDisturbance;

    uniform sampler2D uPuhoro;
    uniform float     uHasPuhoro;

    uniform sampler2D uMataora;
    uniform float     uHasMataora;

    uniform float uCalm;

    // LUNG OVAL FUNCTION
    float oval(vec2 uv, vec2 center, float rx, float ry) {
      vec2 p = (uv - center);
      p.x /= rx;
      p.y /= ry;
      float d = dot(p, p);
      return smoothstep(1.2, 0.0, d); // soft-edged oval
    }

    void main() {
      // keep a copy of original uv for some things
      vec2 uv = vUv;
      float t = uTime * 0.5;

      // --- BASE MIRROR GRADIENT ---
      vec3 topCol = vec3(0.10, 0.30, 0.60);
      vec3 botCol = vec3(0.01, 0.02, 0.08);
      vec3 base = mix(botCol, topCol, uv.y);

      // --- RIPPLE FIELD (soft) ---
      vec2 d = uv - uPointer;
      float dist = length(d);

      float wave = sin(dist * 24.0 - t * 5.0) * exp(-10.0 * dist) * uDisturbance;

      // --- LUNG BREATH (shape + motion) ---

      // Lung centers in UV
      vec2 leftC  = vec2(0.40, 0.55);
      vec2 rightC = vec2(0.60, 0.55);

      float rx = 0.18;
      float ry = 0.20;

      float leftOval  = oval(uv, leftC,  rx, ry);
      float rightOval = oval(uv, rightC, rx, ry);
      float lungMask  = max(leftOval, rightOval);

      // Breathing time function (0 -> 1 -> 0)
      float breath = 0.5 + 0.5 * sin(t * 0.35);

      // Breathing reveal amount: 0% -> 3% -> 0% inside lungs
      float lungReveal = lungMask * mix(0.0, 0.03, breath);

      // Small lung warp (feels like pressure under water)
      float lungWarp = lungMask * (breath * 0.02);

      // Apply lung warp to UV around centre
      vec2 lungUv = uv + (uv - 0.5) * lungWarp;

      // --- PUHORO SAMPLE & WARP ---
      vec3 puhoroCol = vec3(0.0);
      if (uHasPuhoro > 0.5) {
        vec4 tex = texture2D(uPuhoro, lungUv);
        float mask = max(tex.r, max(tex.g, tex.b));
        puhoroCol = mix(vec3(0.0), vec3(0.92, 0.96, 1.0), mask);
      }

      // Extra ripple-based UV offset (ink riding the waves)
      float strength = 0.015;
      vec2 dir = (dist > 0.0001) ? normalize(d) : vec2(0.0, 0.0);
      vec2 waveOffset = dir * wave * strength;

      vec2 waveUv = lungUv + waveOffset;

      vec3 puhoroWarped = vec3(0.0);
      if (uHasPuhoro > 0.5) {
        vec4 tex2 = texture2D(uPuhoro, waveUv);
        float mask2 = max(tex2.r, max(tex2.g, tex2.b));
        puhoroWarped = mix(vec3(0.0), vec3(0.92, 0.96, 1.0), mask2);
      }

      // --- MATAORA SAMPLE (hidden until calm) ---
	  vec3 mataoraCol = vec3(0.0);
	  if (uHasMataora > 0.5) {
	  // slight scale so face sits nicely in mirror
	  vec2 mUv = (vUv - 0.5) * 0.95 + 0.5;
	  vec4 mTex = texture2D(uMataora, mUv);

	  // USE ALPHA AS MASK so transparent areas stay invisible
	  float mMask = mTex.a;

	  // subtle bone/ink colour only where alpha > 0
	  mataoraCol = mix(vec3(0.0), vec3(0.96, 0.98, 1.0), mMask);
	  }


      // --- REVEAL LOGIC ---

      // 1) LUNG breathing reveal (0–3% in lungs)
      //    already computed: lungReveal

      // 2) Wave reveal (extra where interference is strong)
      float waveReveal = abs(wave) * 6.0;

      // 3) Combined puhoro reveal factor
      float puhoroReveal = lungReveal + waveReveal;
      puhoroReveal = clamp(puhoroReveal, 0.0, 1.0);

      // 4) Mataora calm reveal based on calm SECONDS:
	  // - no reveal for first ~10s of calm
	  // - fade from 0 -> 1 over the next 20s (10s..30s)
	  float startSec   = 10.0;
	  float fadeDurSec = 20.0;

	  float mataoraReveal = (uCalm - startSec) / fadeDurSec;
	  mataoraReveal = clamp(mataoraReveal, 0.0, 1.0);


      // --- Base mirror shade from waves ---
      float shade = wave * 0.25;
      vec3 col = base + vec3(shade);

      // --- Composite ---
      // Puhoro lives in lungs + waves
      col += puhoroWarped * puhoroReveal;

      // Mataora lives only in deep calm
      col += mataoraCol * mataoraReveal;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

   // --- Load Puhoro Texture ---
	const texLoader = new THREE.TextureLoader();
	texLoader.load(
	  "/assets/textures/puhoro_interference.png",
	  (tex) => {
		tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
		tex.encoding = THREE.sRGBEncoding;
		uniforms.uPuhoro.value = tex;
		uniforms.uHasPuhoro.value = 1.0;
		console.log("Puhoro texture loaded for mirror.");
	  },
	  undefined,
	  (err) => console.error("Error loading puhoro texture", err)
	);

	// --- Load Mataora Texture ---
	texLoader.load(
	  "/assets/textures/mataora_pattern.png",
	  (tex) => {
		tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
		tex.encoding = THREE.sRGBEncoding;
		uniforms.uMataora.value = tex;
		uniforms.uHasMataora.value = 1.0;
		console.log("Mataora texture loaded for mirror.");
	  },
	  undefined,
	  (err) => console.error("Error loading mataora texture", err)
	);


  // --- POINTER DISTURBANCE ---
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;

    uniforms.uPointer.value.set(x, y);
    uniforms.uDisturbance.value = 1.0;
  }

  canvas.addEventListener("pointermove", onPointerMove);

  // --- CALM TIMER (seconds of stillness) ---
	let lastTime = 0;
	let calmSeconds = 0.0; // measured in seconds

	function animate(t) {
	  requestAnimationFrame(animate);

	  if (!lastTime) lastTime = t;
	  const dt = (t - lastTime) / 1000.0; // ms -> seconds
	  lastTime = t;

	  uniforms.uTime.value = t * 0.001;

	  // disturbance decays
	  uniforms.uDisturbance.value = Math.max(
		0.0,
		uniforms.uDisturbance.value - 0.02
	  );

	  // calm logic:
	  // if mirror is very undisturbed, accumulate calm time,
	  // otherwise burn it off faster.
	  if (uniforms.uDisturbance.value < 0.1) {
		calmSeconds += dt;          // +1s per real second of calm
	  } else {
		calmSeconds -= dt * 2.0;    // lose calm twice as fast when disturbed
	  }

	  // clamp calmSeconds to a sane range
	  if (calmSeconds < 0.0) calmSeconds = 0.0;
	  if (calmSeconds > 60.0) calmSeconds = 60.0; // cap at 1 minute

	  // pass calmSeconds (in seconds) into the shader
	  uniforms.uCalm.value = calmSeconds;

	  renderer.render(scene, camera);
	}


  animate(0);
})();
