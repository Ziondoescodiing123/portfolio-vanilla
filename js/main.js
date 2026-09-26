/**
 * Portfolio interactivity — theme, nav, hero word rotate, marquee, spotlight, reveal, contact form.
 */

(function () {
  const THEME_KEY = 'zion-theme';
  const ROTATE_WORDS = ['web pages', 'clean UI', 'new skills', 'side projects'];
  const PROFILE_EMAIL = 'zionuzuokoh@gmail.com';

  const html = document.documentElement;
  const header = document.getElementById('site-header');
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleDrawer = document.getElementById('theme-toggle-drawer');
  const menuOpenBtn = document.getElementById('menu-open');
  const menuCloseBtn = document.getElementById('menu-close');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerPanel = document.getElementById('drawer-panel');
  const drawerLinks = document.querySelectorAll('[data-drawer-close]');
  const wordRotateEl = document.getElementById('word-rotate');
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const footerYear = document.getElementById('footer-year');

  function getTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeIcons(theme);
  }

  function updateThemeIcons(theme) {
    const isDark = theme === 'dark';
    document.querySelectorAll('[data-theme-icon="sun"]').forEach((el) => {
      el.hidden = !isDark;
    });
    document.querySelectorAll('[data-theme-icon="moon"]').forEach((el) => {
      el.hidden = isDark;
    });
    document.querySelectorAll('[data-theme-label]').forEach((el) => {
      el.textContent = isDark ? 'Light mode' : 'Dark mode';
    });
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function openDrawer() {
    drawerBackdrop.classList.add('is-open');
    drawerPanel.classList.add('is-open');
    drawerBackdrop.setAttribute('aria-hidden', 'false');
    drawerPanel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawerBackdrop.classList.remove('is-open');
    drawerPanel.classList.remove('is-open');
    drawerBackdrop.setAttribute('aria-hidden', 'true');
    drawerPanel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function onScroll() {
    if (!header) return;
    header.classList.toggle('header-scrolled', window.scrollY > 24);
  }

  function initWordRotate() {
    if (!wordRotateEl) return;
    let index = 0;

    setInterval(() => {
      wordRotateEl.classList.add('is-exiting');
      setTimeout(() => {
        index = (index + 1) % ROTATE_WORDS.length;
        wordRotateEl.textContent = ROTATE_WORDS[index];
        wordRotateEl.classList.remove('is-exiting');
        wordRotateEl.classList.add('is-entering');
        requestAnimationFrame(() => {
          wordRotateEl.classList.remove('is-entering');
        });
      }, 280);
    }, 2800);
  }

  function initSpotlightCards() {
    document.querySelectorAll('.spotlight-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);
      });
    });
  }

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '-80px', threshold: 0.08 },
    );

    items.forEach((el) => observer.observe(el));
  }

  function initContactForm() {
    if (!contactForm) return;

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(contactForm);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const message = String(data.get('message') || '').trim();
      const subject = encodeURIComponent(`Portfolio inquiry from ${name || 'someone'}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:${PROFILE_EMAIL}?subject=${subject}&body=${body}`;
      if (formStatus) {
        formStatus.hidden = false;
        formStatus.textContent = 'Opening your email client…';
      }
    });
  }

  setTheme(getTheme());
  onScroll();
  initWordRotate();
  initSpotlightCards();
  initReveal();
  initContactForm();

  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  window.addEventListener('scroll', onScroll, { passive: true });

  themeToggle?.addEventListener('click', toggleTheme);
  themeToggleDrawer?.addEventListener('click', toggleTheme);
  menuOpenBtn?.addEventListener('click', openDrawer);
  menuCloseBtn?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);
  drawerPanel?.addEventListener('click', (e) => e.stopPropagation());

  drawerLinks.forEach((link) => link.addEventListener('click', closeDrawer));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
})();
