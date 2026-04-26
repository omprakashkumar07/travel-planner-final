/* ═══════════════════════════════════════════════════════
   LOGIN-CHARACTER.JS — Interactive Rive Teddy Bear
   Tracks typing, covers eyes on password, celebrates login
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Configuration ── */
  var RIV_PATH = '../images/login-character.riv';
  var STATE_MACHINE = 'Login Machine';
  var CANVAS_SIZE = { w: 300, h: 300 };

  /* ── State Machine Input Names ── */
  var INPUT_NAMES = {
    isChecking: 'isChecking',
    isHandsUp:  'isHandsUp',
    numLook:    'numLook',
    trigSuccess:'trigSuccess',
    trigFail:   'trigFail'
  };

  /* ── DOM refs (set on init) ── */
  var riveInstance = null;
  var inputs = {};

  /* ═══════════════════════════════════════
     1. SETUP — create canvas, init Rive
  ═══════════════════════════════════════ */
  function init() {
    /* Only run on login page */
    var loginCard = document.querySelector('.auth-card-login');
    if (!loginCard) return;

    /* Check Rive runtime loaded */
    if (typeof rive === 'undefined') {
      console.warn('[LoginCharacter] Rive runtime not loaded — fallback to emoji');
      return;
    }

    /* Find auth-logo containers and replace with canvas */
    var loginLogo = loginCard.querySelector('.auth-logo');
    var signupCard = document.querySelector('.auth-card-signup');
    var signupLogo = signupCard ? signupCard.querySelector('.auth-logo') : null;

    if (!loginLogo) return;

    /* Create canvas element */
    var canvas = document.createElement('canvas');
    canvas.id = 'login-character-canvas';
    canvas.width = CANVAS_SIZE.w;
    canvas.height = CANVAS_SIZE.h;
    canvas.setAttribute('aria-label', 'Animated login character');

    /* Replace emoji logo with canvas container */
    loginLogo.textContent = '';
    loginLogo.className = 'auth-logo auth-logo-character';
    loginLogo.appendChild(canvas);

    /* Hide signup logo emoji — character is only on login side */
    /* (signup uses a different icon) */

    /* Initialize Rive */
    try {
      riveInstance = new rive.Rive({
        src: RIV_PATH,
        canvas: canvas,
        autoplay: true,
        stateMachines: STATE_MACHINE,
        onLoad: function () {
          riveInstance.resizeDrawingSurfaceToCanvas();
          extractInputs();
          wireFormEvents();
        },
        onLoadError: function (err) {
          console.warn('[LoginCharacter] Failed to load .riv:', err);
          restoreFallback(loginLogo);
        }
      });
    } catch (err) {
      console.warn('[LoginCharacter] Rive init error:', err);
      restoreFallback(loginLogo);
    }
  }

  /* ═══════════════════════════════════════
     2. EXTRACT STATE MACHINE INPUTS
  ═══════════════════════════════════════ */
  function extractInputs() {
    if (!riveInstance) return;
    var smInputs = riveInstance.stateMachineInputs(STATE_MACHINE);
    if (!smInputs) {
      console.warn('[LoginCharacter] No state machine inputs found');
      return;
    }

    smInputs.forEach(function (inp) {
      if (inp.name === INPUT_NAMES.isChecking) inputs.isChecking = inp;
      if (inp.name === INPUT_NAMES.isHandsUp)  inputs.isHandsUp  = inp;
      if (inp.name === INPUT_NAMES.numLook)    inputs.numLook    = inp;
      if (inp.name === INPUT_NAMES.trigSuccess) inputs.trigSuccess = inp;
      if (inp.name === INPUT_NAMES.trigFail)    inputs.trigFail    = inp;
    });
  }

  /* ═══════════════════════════════════════
     3. WIRE FORM EVENTS — eye tracking + hands up
  ═══════════════════════════════════════ */
  function wireFormEvents() {
    /* Login form fields */
    var loginEmail = document.getElementById('login-email');
    var loginPassword = document.getElementById('login-password');

    /* Signup form fields */
    var signupName = document.getElementById('signup-name');
    var signupEmail = document.getElementById('signup-email');
    var signupMobile = document.getElementById('signup-mobile');
    var signupPassword = document.getElementById('signup-password');
    var signupConfirm = document.getElementById('signup-confirm');

    /* ── Text fields → eye tracking ── */
    var textFields = [loginEmail, signupName, signupEmail, signupMobile].filter(Boolean);
    textFields.forEach(function (field) {
      field.addEventListener('focus', function () {
        setChecking(true);
        updateLook(field);
      });

      field.addEventListener('blur', function () {
        setChecking(false);
      });

      field.addEventListener('input', function () {
        updateLook(field);
      });
    });

    /* ── Password fields → hands up (cover eyes) ── */
    var passwordFields = [loginPassword, signupPassword, signupConfirm].filter(Boolean);
    passwordFields.forEach(function (field) {
      field.addEventListener('focus', function () {
        setChecking(false);
        setHandsUp(true);
      });

      field.addEventListener('blur', function () {
        setHandsUp(false);
      });
    });

    /* ── Expose success/fail triggers for auth.js ── */
    window._loginCharacter = {
      trigSuccess: function () {
        if (inputs.trigSuccess && typeof inputs.trigSuccess.fire === 'function') {
          inputs.trigSuccess.fire();
        }
      },
      trigFail: function () {
        if (inputs.trigFail && typeof inputs.trigFail.fire === 'function') {
          inputs.trigFail.fire();
        }
      }
    };
  }

  /* ═══════════════════════════════════════
     4. HELPERS — smooth state transitions
  ═══════════════════════════════════════ */
  function setChecking(val) {
    if (inputs.isChecking) inputs.isChecking.value = val;
  }

  function setHandsUp(val) {
    if (inputs.isHandsUp) inputs.isHandsUp.value = val;
  }

  function updateLook(field) {
    if (!inputs.numLook) return;

    /* Map text length (0–30 chars) to look range (0–100) */
    var len = (field.value || '').length;
    var maxLen = 30;
    var normalized = Math.min(len / maxLen, 1);
    /* Center the look: 0 = far left, 50 = center, 100 = far right */
    inputs.numLook.value = normalized * 100;
  }

  /* ═══════════════════════════════════════
     5. FALLBACK — restore emoji if Rive fails
  ═══════════════════════════════════════ */
  function restoreFallback(logoEl) {
    if (!logoEl) return;
    logoEl.className = 'auth-logo';
    logoEl.textContent = '✈️';
  }

  /* ═══════════════════════════════════════
     6. INIT ON DOM READY
  ═══════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /* DOM already loaded (scripts at bottom of body) */
    init();
  }

})();
