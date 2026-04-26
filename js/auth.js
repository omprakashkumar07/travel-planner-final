/* ═══════════════════════════════════════════════
   AUTH.JS — Login / Sign Up Logic
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initFlipToggle();
  initPasswordToggles();
  initPasswordStrength();
  initLoginForm();
  initSignupForm();
  initResetForm();
});

/* ── 3D Flip Toggle ── */
function initFlipToggle() {
  const container = document.getElementById('auth-container');
  const toSignup = document.getElementById('to-signup');
  const toLogin = document.getElementById('to-login');

  if (toSignup) {
    toSignup.addEventListener('click', (e) => {
      e.preventDefault();
      container.classList.add('flipped');
    });
  }

  if (toLogin) {
    toLogin.addEventListener('click', (e) => {
      e.preventDefault();
      container.classList.remove('flipped');
    });
  }
}

/* ── Password Visibility Toggle ── */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = toggle.parentElement.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = '🙈';
      } else {
        input.type = 'password';
        toggle.textContent = '👁️';
      }
    });
  });
}

/* ── Password Strength Meter ── */
function initPasswordStrength() {
  const passwordInput = document.getElementById('signup-password');
  if (!passwordInput) return;

  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    const bars = document.querySelectorAll('.strength-bar');
    const label = document.getElementById('strength-label');
    const strength = calculateStrength(val);

    const levels = ['weak', 'medium', 'strong', 'very-strong'];
    const labels = ['Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['#ff4444', '#ffaa00', '#44cc44', '#00ddaa'];

    bars.forEach((bar, i) => {
      bar.classList.remove('active', 'weak', 'medium', 'strong', 'very-strong');
      if (i < strength) {
        bar.classList.add('active', levels[strength - 1]);
      }
    });

    if (label) {
      if (val.length === 0) {
        label.textContent = '';
      } else {
        label.textContent = labels[strength - 1] || 'Weak';
        label.style.color = colors[strength - 1] || colors[0];
      }
    }
  });
}

function calculateStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

/* ── Login Form ── */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = form.querySelector('.auth-submit');

    if (!identifier || !password) {
      shakeForm(form);
      showToast('Please fill in all fields', 'error');
      return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store JWT token for authenticated API calls
        localStorage.setItem('tp_token', data.token);
        localStorage.setItem('tp_user', JSON.stringify(data.user));
        if (window._loginCharacter) window._loginCharacter.trigSuccess();
        handleSuccess(form, `Welcome back, ${data.user.name}!`);
      } else {
        if (window._loginCharacter) window._loginCharacter.trigFail();
        shakeForm(form);
        showToast(data.error || 'Login failed', 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Login error:', error);
      if (window._loginCharacter) window._loginCharacter.trigFail();
      shakeForm(form);
      showToast('Cannot connect to server', 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

/* ── Signup Form ── */
function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const mobile = document.getElementById('signup-mobile').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const btn = form.querySelector('.auth-submit');

    if (!name || !email || !mobile || !password || !confirm) {
      shakeForm(form);
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (password !== confirm) {
      shakeForm(form);
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      shakeForm(form);
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store JWT token for authenticated API calls
        localStorage.setItem('tp_token', data.token);
        localStorage.setItem('tp_user', JSON.stringify(data.user));
        if (window._loginCharacter) window._loginCharacter.trigSuccess();
        handleSuccess(form, `Welcome aboard, ${name}!`);
      } else {
        if (window._loginCharacter) window._loginCharacter.trigFail();
        shakeForm(form);
        showToast(data.error || 'Signup failed', 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Signup error:', error);
      shakeForm(form);
      showToast('Cannot connect to server', 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

/* ── Success Handler ── */
function handleSuccess(form, message) {
  const btn = form.querySelector('.auth-submit');
  btn.classList.add('success');
  btn.textContent = '✓ Success!';

  // Show overlay
  const overlay = document.getElementById('success-overlay');
  const overlayMsg = document.getElementById('success-message');
  if (overlayMsg) overlayMsg.textContent = message;

  setTimeout(() => {
    overlay.classList.add('show');
    launchConfetti();
  }, 400);

  // Redirect to Dashboard (Profile) after animation
  setTimeout(() => {
    window.location.href = 'profile.html';
  }, 2800);
}

/* ── Confetti ── */
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;

  const colors = ['#ff6b6b', '#ffd93d', '#4ecdc4', '#a855f7', '#3b82f6', '#ec4899', '#f59e0b'];

  for (let i = 0; i < 60; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = (Math.random() * 8 + 5) + 'px';
    confetti.style.height = (Math.random() * 8 + 5) + 'px';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    confetti.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
    confetti.style.animationDelay = (Math.random() * 0.8) + 's';
    container.appendChild(confetti);
  }
}

/* ── Shake Animation ── */
function shakeForm(form) {
  form.style.animation = 'none';
  form.offsetHeight; // trigger reflow
  form.style.animation = 'shake 0.5s ease';
}

// Shake keyframes injected via JS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-8px); }
    30% { transform: translateX(8px); }
    45% { transform: translateX(-6px); }
    60% { transform: translateX(6px); }
    75% { transform: translateX(-3px); }
    90% { transform: translateX(3px); }
  }
`;
document.head.appendChild(shakeStyle);

/* ── Reset Password Form ── */
function initResetForm() {
  const resetOverlay = document.getElementById('reset-overlay');
  const closeBtn = document.getElementById('close-reset');
  const forgotLink = document.querySelector('.forgot-link');
  const resetForm = document.getElementById('reset-form');

  if (!resetOverlay || !resetForm) return;

  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      resetOverlay.classList.add('show');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      resetOverlay.classList.remove('show');
      resetForm.reset();
    });
  }

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('reset-identifier').value.trim();
    const newPassword = document.getElementById('reset-password').value;
    const btn = resetForm.querySelector('.auth-submit');

    if (!identifier || !newPassword) {
      shakeForm(resetForm);
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      shakeForm(resetForm);
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Updating...';
    btn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        btn.classList.add('success');
        btn.textContent = '✓ Updated!';
        showToast('Password reset successfully! You can now log in.', 'success');
        
        setTimeout(() => {
          resetOverlay.classList.remove('show');
          resetForm.reset();
          btn.classList.remove('success');
          btn.textContent = originalText;
          btn.disabled = false;
        }, 1500);
      } else {
        shakeForm(resetForm);
        showToast(data.error || 'Password reset failed', 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Reset password error:', error);
      shakeForm(resetForm);
      showToast('Cannot connect to server', 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}
