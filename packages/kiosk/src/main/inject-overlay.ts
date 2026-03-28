/**
 * Returns JavaScript that creates the kiosk unlock overlay.
 * Uses direct fetch() for password verification and window.__KIOSK_ACTION__
 * for communicating exit/minimize/relock back to the main process.
 */
export function getUnlockOverlayScript(backendUrl: string): string {
  return `
(function() {
  var existing = document.getElementById('kiosk-unlock-overlay');
  if (existing) { existing.remove(); return; }

  if (!document.getElementById('kiosk-unlock-styles')) {
    var style = document.createElement('style');
    style.id = 'kiosk-unlock-styles';
    style.textContent = [
      '.kiosk-unlock-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(6,11,20,0.92);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;direction:rtl;font-family:Heebo,Segoe UI,sans-serif; }',
      '.kiosk-unlock-panel { background:#151f32;border:1px solid #1e2d4a;border-radius:12px;padding:40px;width:380px;display:flex;flex-direction:column;align-items:center;gap:24px;box-shadow:0 8px 32px rgba(0,0,0,0.4); }',
      '.kiosk-unlock-panel h2 { font-size:20px;font-weight:600;color:#e8edf5;margin:0; }',
      '.kiosk-unlock-panel input { width:100%;padding:12px 16px;border:1px solid #1e2d4a;background:#060b14;color:#e8edf5;font-family:Heebo,sans-serif;font-size:16px;border-radius:8px;outline:none;direction:ltr;text-align:center;box-sizing:border-box; }',
      '.kiosk-unlock-panel input:focus { border-color:#00d4aa;box-shadow:0 0 0 2px rgba(0,212,170,0.12); }',
      '.kiosk-error { color:#ff4d6a;font-size:14px;min-height:20px;text-align:center; }',
      '.kiosk-actions { display:flex;gap:12px;width:100%; }',
      '.kiosk-actions button { flex:1;padding:10px 16px;border-radius:8px;font-family:Heebo,sans-serif;font-size:14px;font-weight:500;cursor:pointer;border:1px solid #1e2d4a; }',
      '.kbtn-verify { background:#00d4aa;color:#060b14;border-color:#00d4aa; }',
      '.kbtn-cancel { background:transparent;color:#8899b4; }',
      '.kbtn-exit { background:#ff4d6a;color:white;border-color:#ff4d6a; }',
      '.kbtn-minimize { background:transparent;color:#00d4aa;border-color:#00d4aa; }',
    ].join('\\n');
    document.head.appendChild(style);
  }

  var BACKEND = '${backendUrl}';
  var overlay = document.createElement('div');
  overlay.id = 'kiosk-unlock-overlay';
  overlay.className = 'kiosk-unlock-overlay';

  // Append to DOM FIRST so querySelector works
  document.body.appendChild(overlay);

  showPasswordForm();

  function showPasswordForm() {
    overlay.innerHTML = '<div class="kiosk-unlock-panel">'
      + '<h2>נעילת קיוסק</h2>'
      + '<input type="password" class="kiosk-pw" placeholder="הזן סיסמת מנהל" autocomplete="off" />'
      + '<div class="kiosk-error"></div>'
      + '<div class="kiosk-actions">'
      + '<button class="kbtn-verify">אימות</button>'
      + '<button class="kbtn-cancel">ביטול</button>'
      + '</div></div>';

    var input = overlay.querySelector('.kiosk-pw');
    var verifyBtn = overlay.querySelector('.kbtn-verify');
    var cancelBtn = overlay.querySelector('.kbtn-cancel');
    var errorEl = overlay.querySelector('.kiosk-error');

    setTimeout(function() { if (input) input.focus(); }, 100);

    function verify() {
      var password = input ? input.value : '';
      if (!password) { if (errorEl) errorEl.textContent = 'יש להזין סיסמה'; return; }
      if (verifyBtn) { verifyBtn.textContent = 'מאמת...'; verifyBtn.disabled = true; }

      fetch(BACKEND + '/api/auth/verify-kiosk-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password }),
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.valid) {
          showUnlockedActions();
        } else {
          if (errorEl) errorEl.textContent = 'סיסמה שגויה';
          if (input) { input.value = ''; input.focus(); }
          if (verifyBtn) { verifyBtn.textContent = 'אימות'; verifyBtn.disabled = false; }
        }
      })
      .catch(function(err) {
        if (errorEl) errorEl.textContent = 'שגיאת תקשורת';
        if (verifyBtn) { verifyBtn.textContent = 'אימות'; verifyBtn.disabled = false; }
        console.error('Kiosk verify error:', err);
      });
    }

    verifyBtn.addEventListener('click', verify);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') verify(); });
    cancelBtn.addEventListener('click', function() { overlay.remove(); });
  }

  function showUnlockedActions() {
    overlay.innerHTML = '<div class="kiosk-unlock-panel">'
      + '<h2>קיוסק לא נעול</h2>'
      + '<p style="color:#8899b4;font-size:14px;text-align:center;">בחר פעולה:</p>'
      + '<div class="kiosk-actions">'
      + '<button class="kbtn-exit">יציאה</button>'
      + '<button class="kbtn-minimize">מזעור</button>'
      + '</div>'
      + '<button class="kbtn-cancel" style="width:100%;margin-top:8px;">נעילה מחדש</button>'
      + '</div>';

    overlay.querySelector('.kbtn-exit').addEventListener('click', function() {
      window.__KIOSK_ACTION__ = 'exit';
    });
    overlay.querySelector('.kbtn-minimize').addEventListener('click', function() {
      window.__KIOSK_ACTION__ = 'minimize';
      overlay.remove();
    });
    overlay.querySelector('.kbtn-cancel').addEventListener('click', function() {
      window.__KIOSK_ACTION__ = 'relock';
      overlay.remove();
    });
  }
})();
  `.trim();
}

export function getRemoveOverlayScript(): string {
  return `(function() { var o = document.getElementById('kiosk-unlock-overlay'); if (o) o.remove(); })();`;
}

export function getCheckActionScript(): string {
  return `(function() { var a = window.__KIOSK_ACTION__; window.__KIOSK_ACTION__ = null; return a || null; })();`;
}
