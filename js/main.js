/* ═══════════════════════════════════════════════
   MAIN.JS — Shared Navigation, Scroll, Animations
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initThemeSystem();
  protectRoutes();
  initNavbar();
  initScrollReveal();
  initActiveNav();
  updateAuthNav();
});

/* ── Route Protection ── */
function protectRoutes() {
  const protectedPages = ['profile.html', 'budget.html', 'chat.html', 'preferences.html'];
  const currentPage = window.location.pathname.split('/').pop();
  const token = localStorage.getItem('tp_token');
  const user = (() => { try { return JSON.parse(localStorage.getItem('tp_user')); } catch { return null; } })();

  if (protectedPages.includes(currentPage) && (!token || !user)) {
    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    window.location.href = isRoot ? 'pages/login.html' : 'login.html';
  }
}

/* ── Theme System ── */
function initThemeSystem() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.innerHTML = `
      <span class="theme-toggle-label">Theme</span>
      <span class="theme-toggle-icon">${savedTheme === 'dark' ? '☀️' : '🌙'}</span>
    `;
    
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeBtn.querySelector('.theme-toggle-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
      
      const icon = themeBtn.querySelector('.theme-toggle-icon');
      icon.style.transform = 'scale(1.2)';
      icon.style.display = 'inline-block';
      icon.style.transition = 'transform 0.3s ease';
      setTimeout(() => icon.style.transform = 'scale(1)', 150);
    });

    navLinks.appendChild(themeBtn);
  }
}

/* ── Auth Nav Update ── */
function updateAuthNav() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('tp_user')); } catch { return null; } })();
  const token = localStorage.getItem('tp_token');
  const navLinks = document.querySelector('.nav-links');
  const loginLink = Array.from(document.querySelectorAll('.navbar .nav-cta')).find(l => l.textContent.includes('Login'));

  if (user && token && loginLink) {
    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';

    loginLink.setAttribute('href', isRoot ? 'pages/profile.html' : 'profile.html');
    loginLink.innerHTML = 'Profile 👤';
    loginLink.classList.remove('active');

    const logoutBtn = document.createElement('a');
    logoutBtn.href = '#';
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cssText = 'color: #ff4444; font-weight: 500; cursor: pointer; padding: 8px 16px; margin-left: 8px; border: 1px solid rgba(255,0,0,0.2); border-radius: 20px;';
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Clear both user and token
      localStorage.removeItem('tp_user');
      localStorage.removeItem('tp_token');
      window.location.href = isRoot ? 'index.html' : '../index.html';
    });
    navLinks.insertBefore(logoutBtn, loginLink.nextSibling);
  }
}

/* ── Navbar ── */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  if (!hamburger || !navLinks) return;

  // ── Inject backdrop overlay (mobile only) ──
  let backdrop = document.getElementById('nav-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'nav-backdrop';
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);
  }

  function openMenu() {
    hamburger.classList.add('active');
    navLinks.classList.add('open');
    backdrop.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('active');
    navLinks.classList.remove('open');
    backdrop.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    if (navLinks.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Click backdrop → close
  backdrop.addEventListener('click', closeMenu);

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Escape key → close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      closeMenu();
    }
  });
}

/* ── Active Nav Link ── */
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    const linkPage = href.split('/').pop();
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* ── Scroll Reveal (Intersection Observer) ── */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger-children');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Once visible, stop watching — prevents re-hiding on scroll back
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 0px 0px' });

  reveals.forEach(el => observer.observe(el));
}

/* ── Toast Notification ── */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ── Counter Animation ── */
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-count'));
    const suffix = counter.getAttribute('data-suffix') || '';
    const duration = 2000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + (target - start) * eased);
      counter.textContent = current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

// Trigger counter animation on scroll
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.addEventListener('DOMContentLoaded', () => {
  const statsSection = document.querySelector('.stats-row');
  if (statsSection) statsObserver.observe(statsSection);
});
