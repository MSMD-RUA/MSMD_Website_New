// hei_rata_kiri_skin.js
// Gate 4 — Hei Rata Kiri Viewer (global THREE + GLTFLoader + OrbitControls)

(function () {
  if (typeof THREE === "undefined") {
    console.warn("Hei Rata viewer: THREE.js not found on window.");
    return;
  }

  const canvas = document.getElementById("hei-rata-canvas");
  if (!canvas) {
    console.warn("Hei Rata viewer: #hei-rata-canvas not found.");
    return;
  }

  // --- Renderer / scene / camera ---

  let width = canvas.clientWidth || 800;
  let height = canvas.clientHeight || 450;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 50);
  camera.position.set(0.5, 0.6, 1.2);

  // --- Lights ---

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 0.9);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(2, 2, 2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
  rimLight.position.set(-2, 1.5, -1.5);
  scene.add(rimLight);

  // --- Controls ---

  let controls;
  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 0.3;
    controls.maxDistance = 3.0;
    controls.rotateSpeed = 0.7;
  } else {
    console.warn("Hei Rata viewer: OrbitControls not available.");
  }

  // --- Hei Rata group ---

  const root = new THREE.Group();
  scene.add(root);

  let heiRata;
  let autoRotate = true;

  // --- GLB loader ---

  if (!THREE.GLTFLoader) {
    console.warn("Hei Rata viewer: GLTFLoader not available.");
    return;
  }

  const loader = new THREE.GLTFLoader();

  loader.load(
    "assets/hei_rata_v1.glb",
    function (gltf) {
      heiRata = gltf.scene || gltf.scenes[0];
      root.add(heiRata);

      // Basic normalisation: centre + scale to fit viewer
      const box = new THREE.Box3().setFromObject(heiRata);
      const size = new THREE.Vector3();
      const centre = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(centre);

      const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
      const scale = 0.9 / maxDim;
      heiRata.scale.setScalar(scale);
      heiRata.position.sub(centre.multiplyScalar(scale)); // centre at origin

      // Lift slightly so base sits near "floor"
      heiRata.position.y -= box.min.y * scale * 0.15;

      // Soft kiri tweak: make sure materials use sRGB and a little emissive depth
      heiRata.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const m = obj.material;
          if (m.map) m.map.encoding = THREE.sRGBEncoding;
          if (m.emissive === undefined) m.emissive = new THREE.Color(0x000000);

          // gentle paua-ish kiri lift
          m.emissiveIntensity = 0.18;
          m.emissive = m.emissive.clone().add(new THREE.Color(0x0b1120));
          m.needsUpdate = true;
        }
      });

      // Frame camera nicely
      if (controls) {
        controls.target.set(0, size.y * scale * 0.25, 0);
        controls.update();
      } else {
        camera.lookAt(0, size.y * scale * 0.25, 0);
      }

      console.log("Hei Rata viewer: GLB loaded.");
    },
    undefined,
    function (err) {
      console.error("Hei Rata viewer: error loading GLB", err);
    }
  );

  // --- Resize handling ---

  function onResize() {
    const newWidth = canvas.clientWidth || width;
    const newHeight = canvas.clientHeight || height;
    if (!newWidth || !newHeight) return;

    width = newWidth;
    height = newHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", onResize);

  // --- Interaction: pause auto-rotate on user input ---

  if (controls) {
    const stopAutoRotate = () => {
      autoRotate = false;
    };
    controls.addEventListener("start", stopAutoRotate);
    canvas.addEventListener("pointerdown", stopAutoRotate);
    canvas.addEventListener("wheel", stopAutoRotate, { passive: true });
  }

  // --- Animation loop ---

  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (controls) controls.update();

    if (heiRata && autoRotate) {
      heiRata.rotation.y += delta * 0.25; // slow spin
    }

    renderer.render(scene, camera);
  }

  animate(performance.now());
})();
