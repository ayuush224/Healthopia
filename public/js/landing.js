const THEME_STORAGE_KEY = 'soft-health-theme';
const SLIDE_INTERVAL_MS = 4500;

const themeToggleButton = document.getElementById('landing-theme-toggle');
const themeToggleIcon = document.getElementById('landing-theme-icon');
const slides = [...document.querySelectorAll('.landing-slide')];
const dots = [...document.querySelectorAll('.landing-showcase__dots span')];
const scrollButtons = [...document.querySelectorAll('[data-scroll-target]')];

let activeSlideIndex = 0;
let slideTimer = null;

function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;

  const icon = nextTheme === 'dark' ? 'light_mode' : 'dark_mode';
  const label = nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  if (themeToggleIcon) {
    themeToggleIcon.textContent = icon;
  }

  if (themeToggleButton) {
    themeToggleButton.setAttribute('aria-label', label);
  }
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (_error) {
    return null;
  }
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_error) {
    // Ignore storage failures for the landing page.
  }
}

function initializeTheme() {
  const storedTheme = getStoredTheme();

  if (storedTheme === 'light' || storedTheme === 'dark') {
    applyTheme(storedTheme);
    return;
  }

  const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(systemTheme);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  persistTheme(nextTheme);
}

function renderSlide(index) {
  activeSlideIndex = index;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('is-active', slideIndex === activeSlideIndex);
  });

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === activeSlideIndex);
  });
}

function advanceSlide() {
  if (!slides.length) {
    return;
  }

  const nextIndex = (activeSlideIndex + 1) % slides.length;
  renderSlide(nextIndex);
}

function startSlideshow() {
  if (slides.length < 2) {
    return;
  }

  stopSlideshow();
  renderSlide(0);
  slideTimer = window.setInterval(advanceSlide, SLIDE_INTERVAL_MS);
}

function stopSlideshow() {
  if (slideTimer) {
    window.clearInterval(slideTimer);
    slideTimer = null;
  }
}

scrollButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const targetSelector = button.dataset.scrollTarget;
    const target = targetSelector ? document.querySelector(targetSelector) : null;

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

themeToggleButton?.addEventListener('click', toggleTheme);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopSlideshow();
    return;
  }

  startSlideshow();
});

initializeTheme();
startSlideshow();
