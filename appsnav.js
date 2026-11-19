/* Knopf „Alle Lern-Apps“ unten links: führt zurück zur Übersicht „Meine Lern-Apps“.
   Einbinden: <script src="https://bellie161.github.io/Leseapp/appsnav.js" defer></script> */
(function () {
  // Position wählbar über data-pos am Script-Tag: bl (unten links, Standard), br, tl, tr
  var me = document.currentScript, pos = (me && me.getAttribute('data-pos')) || 'bl';
  function add() {
    if (document.getElementById('appsLink') || document.getElementById('lernAppsNav')) return;
    var a = document.createElement('a');
    a.id = 'lernAppsNav'; a.href = 'https://bellie161.github.io/Leseapp/'; a.target = '_top';
    a.textContent = '🎒 Alle Lern-Apps';
    var v = pos.charAt(0) === 't' ? 'top:calc(10px + env(safe-area-inset-top))' : 'bottom:calc(10px + env(safe-area-inset-bottom))';
    var h = pos.charAt(1) === 'r' ? 'right:10px' : 'left:10px';
    a.style.cssText = 'position:fixed;' + v + ';' + h + ';z-index:99990;' +
      'background:rgba(255,255,255,.94);color:#2e2a24;padding:8px 13px;border-radius:14px;font:700 16px/1.2 system-ui,sans-serif;' +
      'text-decoration:none;box-shadow:0 2px 0 rgba(0,0,0,.15),0 1px 6px rgba(0,0,0,.12);border:1px solid #e3ddd2';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
