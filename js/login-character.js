/* ═══════════════════════════════════════════════════════
   LOGIN-CHARACTER.JS — Interactive Rive Teddy Bear
   Tracks typing, covers eyes on password, celebrates login
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Configuration ── */
  var RIV_PATH = '../images/login-character.riv';

  /* ── DOM refs (set on init) ── */
  var riveInstance = null;
  var inputs = {};
  var stateMachineName = null;

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

    /* Find auth-logo container */
    var loginLogo = loginCard.querySelector('.auth-logo');
    if (!loginLogo) return;

    /* Create canvas element — use higher DPR for crisp rendering */
    var dpr = window.devicePixelRatio || 1;
    var displaySize = 200; /* CSS pixels for the canvas area */
    var canvas = document.createElement('canvas');
    canvas.id = 'login-character-canvas';
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-label', 'Animated login character');

    /* Replace emoji logo with canvas container */
    loginLogo.textContent = '';
    loginLogo.className = 'auth-logo auth-logo-character';
    loginLogo.appendChild(canvas);

    /* Store ref for fallback */
    var logoRef = loginLogo;

    /* Initialize Rive with the confirmed state machine name */
    var SM_NAME = 'Login Machine';
    try {
      riveInstance = new rive.Rive({
        src: RIV_PATH,
        canvas: canvas,
        autoplay: true,
        stateMachines: SM_NAME,
        fit: rive.Fit.Cover,
        alignment: rive.Alignment.Center,
        onLoad: function () {
          riveInstance.resizeDrawingSurfaceToCanvas();
          stateMachineName = SM_NAME;

          /* Extract inputs — retry if SM hasn't fully initialized yet */
          function tryExtractInputs(attempts) {
            extractInputs();
            if (Object.keys(inputs).length === 0 && attempts > 0) {
              setTimeout(function() { tryExtractInputs(attempts - 1); }, 100);
            } else {
              wireFormEvents();
              console.info('[LoginCharacter] Ready. SM:', stateMachineName,
                '| Inputs:', Object.keys(inputs).join(', '));
            }
          }
          tryExtractInputs(5);
        },
        onLoadError: function (err) {
          console.warn('[LoginCharacter] .riv load error:', err);
          restoreFallback(logoRef);
        }
      });
    } catch (err) {
      console.warn('[LoginCharacter] Rive init error:', err);
      restoreFallback(logoRef);
    }
  }

  /* ═══════════════════════════════════════
     2. EXTRACT STATE MACHINE INPUTS
  ═══════════════════════════════════════ */
  function extractInputs() {
    if (!riveInstance || !stateMachineName) return;
    var smInputs;
    try {
      smInputs = riveInstance.stateMachineInputs(stateMachineName);
    } catch(e) {
      return;
    }
    if (!smInputs) return;

    smInputs.forEach(function (inp) {
      /* Map known input names (case-insensitive match) */
      var name = (inp.name || '').toLowerCase();
      if (name === 'ischecking' || name === 'is_checking') inputs.isChecking = inp;
      if (name === 'ishandsup' || name === 'is_hands_up') inputs.isHandsUp = inp;
      if (name === 'numlook' || name === 'num_look' || name === 'look') inputs.numLook = inp;
      if (name === 'trigsuccess' || name === 'trig_success' || name === 'success') inputs.trigSuccess = inp;
      if (name === 'trigfail' || name === 'trig_fail' || name === 'fail') inputs.trigFail = inp;
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
    init();
  }

})();
