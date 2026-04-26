/* ═══════════════════════════════════════════════
   JS/CONFIG.JS — Centralised API Base URL
   ═══════════════════════════════════════════════

   Single source of truth for the backend API URL.

   How it works:
     • Production  → Uses the RENDER_BACKEND_URL constant below.
                     Update this after deploying to Render.
     • Local dev   → Falls back to http://localhost:5000

   ─── Usage ────────────────────────────────────
   Include this script BEFORE auth.js / chat.js:
     <script src="../js/config.js"></script>

   Then in any JS file:
     const res = await fetch(`${API_BASE_URL}/login`, { ... });
   ═══════════════════════════════════════════════ */

/**
 * ⬇️  STEP 1: After deploying to Render, paste your URL here.
 *    Example: 'https://travel-planner-api.onrender.com'
 *    Leave empty ('') until you have the Render URL.
 */
const RENDER_BACKEND_URL = 'https://travel-planner-final.onrender.com';   // ← Render backend

/**
 * API_BASE_URL — auto-detects environment.
 *
 *  • localhost / 127.0.0.1 / file://  → local Express server
 *  • any other origin (Vercel)        → production Render URL
 */
window.API_BASE_URL = (function () {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';

  if (!isLocal && RENDER_BACKEND_URL) {
    return RENDER_BACKEND_URL;
  }

  // Local development fallback
  return 'http://localhost:5000';
})();
