// main.js

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupPare() {
  const btnEnterHero = document.getElementById("btn-enter-hero");
  if (!btnEnterHero) return;

  btnEnterHero.addEventListener("click", () => {
    scrollToSection("hero");
  });
}

function setupHero() {
  const heroVideo = document.getElementById("hero-video");
  const btnToggleSound = document.getElementById("btn-toggle-sound");
  const btnToGate1 = document.getElementById("btn-to-gate1");
  const heroSplash = document.getElementById("hero-splash");

  // Sound toggle
  if (btnToggleSound && heroVideo) {
    btnToggleSound.addEventListener("click", () => {
      const isMuted = heroVideo.muted;
      heroVideo.muted = !isMuted;
      btnToggleSound.textContent = heroVideo.muted ? "Unmute" : "Mute";
    });
  }

  // Scroll to Gate 1
  if (btnToGate1) {
    btnToGate1.addEventListener("click", () => {
      scrollToSection("gate1");
    });
  }

  // Karakia splash on video load
  if (heroVideo && heroSplash) {
    const fireSplash = () => {
      // reset animation so it can play even if cached
      heroSplash.classList.remove("hero-splash--flash");
      // force reflow
      void heroSplash.offsetWidth;
      heroSplash.classList.add("hero-splash--flash");
    };

    if (heroVideo.readyState >= 2) {
      // already loaded (cache)
      fireSplash();
    } else {
      heroVideo.addEventListener("loadeddata", fireSplash, { once: true });
    }
  }
}

function setupGate1() {
  const loading = document.getElementById("gate1-loading");
  // We trust gate1_bundle.js to initialise itself using its own container id.
  if (loading && loading.parentNode) {
    loading.parentNode.removeChild(loading);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupPare();
  setupHero();
  setupGate1();
});
