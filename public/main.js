// Simple helpers for the MSMD site (v1)

// Mobile nav toggle
const navToggle = document.querySelector(".msmd-nav-toggle");
const nav = document.querySelector(".msmd-nav");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    nav.classList.toggle("is-open");
  });
}

// Current year in footer
const yearSpan = document.getElementById("msmd-year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear().toString();
}
