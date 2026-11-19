/* =====================================================================
   Denkpause – bremst wahlloses Durchklicken in den Lern-Apps.
   1. falscher Versuch bei einer Aufgabe: 5 Sekunden Sanduhr, alles gesperrt.
   ab dem 2. falschen Versuch: Hilfe-Fenster mit dem Hinweis der App,
      „Ich habe es gelesen“ geht erst nach 10 Sekunden.
   Stern nur, wenn die Aufgabe beim 1. oder 2. Versuch gelöst wurde
   (dafür fragen die Apps DP.right() bzw. DP.earned()).

   Einbinden direkt NACH lernlog.js:
     <script src="denkpause.js"></script>
     optional: data-hint="#feedback" (wo die App ihren Hinweis anzeigt)
   Die App braucht sonst nichts: Denkpause hängt sich an LernLog.start und
   LernLog.fehler an, die alle Apps schon benutzen.

   Ein/Aus für dieses Gerät: auf lernstand.html (mit PIN) – Kinder können
   sie nicht selbst ausschalten. Gespeichert unter localStorage 'denkpause.aus'.
   ===================================================================== */
(function () {
  if (window.DP) return;
  var OFF_KEY = 'denkpause.aus', T1 = 5, T2 = 10;
  var me = document.currentScript, hintSel = (me && me.getAttribute('data-hint')) || '#feedback,#fb,.feedback,.fb';
  var tries = 0, timer = null, hint = '', ov = null, els = {};

  function isOn() { try { return localStorage.getItem(OFF_KEY) !== '1'; } catch (e) { return true; } }
  function clean(t) { return String(t || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

  function build() {
    if (ov || !document.body) return;
    var css = document.createElement('style');
    css.textContent =
      '#dpOv{position:fixed;inset:0;z-index:2147483000;background:rgba(20,30,50,.5);display:none;align-items:center;justify-content:center;' +
      'font-family:"Trebuchet MS","Segoe UI",system-ui,-apple-system,sans-serif;-webkit-user-select:none;user-select:none;touch-action:none}' +
      '#dpOv.on{display:flex}' +
      '#dpCard{background:#fff;border-radius:26px;padding:20px 26px;max-width:700px;width:92%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3);max-height:92vh;overflow-y:auto;color:#1F2A37}' +
      '#dpGlass{font-size:68px;line-height:1;display:inline-block;animation:dpTurn 2.4s ease-in-out infinite}' +
      '@keyframes dpTurn{0%,40%{transform:rotate(0)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(360deg)}}' +
      '#dpTitle{font-size:28px;font-weight:700;margin:6px 0 2px}' +
      '#dpSub{font-size:20px;color:#4b5563;margin:2px 0 6px}' +
      '#dpTxt{font-size:22px;line-height:1.4;margin:10px 0;text-align:left;background:#FFF6CC;border:3px solid #E0B000;border-radius:16px;padding:12px 16px}' +
      '#dpTxt:empty{display:none}' +
      '#dpBar{height:16px;border-radius:8px;background:#e5e7eb;overflow:hidden;margin:12px 0}' +
      '#dpBar i{display:block;height:100%;width:0;background:#F28C28}' +
      '#dpBtns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}' +
      '#dpBtns button{font-family:inherit;border:none;border-radius:16px;font-size:22px;font-weight:700;padding:12px 20px;color:#fff;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.2);touch-action:manipulation}' +
      '#dpSpeak{background:#fff!important;color:#1F2A37!important;border:3px solid #cbd5e1!important;box-shadow:0 3px 0 rgba(0,0,0,.12)!important}' +
      '#dpOk{background:#2A9D4B}#dpOk:disabled{background:#9aa5b1;cursor:default;box-shadow:none}';
    document.head.appendChild(css);
    ov = document.createElement('div'); ov.id = 'dpOv';
    ov.innerHTML = '<div id="dpCard"><div id="dpGlass">⏳</div><div id="dpTitle"></div><div id="dpSub"></div><div id="dpTxt"></div>' +
      '<div id="dpBar"><i></i></div><div id="dpBtns"><button type="button" id="dpSpeak">🔊 Vorlesen</button>' +
      '<button type="button" id="dpOk" disabled>Ich habe es gelesen ✓</button></div></div>';
    document.body.appendChild(ov);
    ['dpTitle', 'dpSub', 'dpTxt', 'dpOk', 'dpSpeak'].forEach(function (id) { els[id] = document.getElementById(id); });
    els.bar = ov.querySelector('#dpBar i');
    els.dpOk.onclick = function () { if (!els.dpOk.disabled) close(); };
    els.dpSpeak.onclick = function () { speak(hint); };
    // Klicks und Tasten erreichen die App nicht, solange die Denkpause offen ist
    ['pointerdown', 'pointerup', 'click', 'touchstart', 'mousedown'].forEach(function (ev) {
      window.addEventListener(ev, function (e) {
        if (ov.classList.contains('on') && !ov.contains(e.target)) { e.stopPropagation(); e.preventDefault(); }
      }, { capture: true, passive: false });
    });
    window.addEventListener('keydown', function (e) {
      if (ov.classList.contains('on')) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  function speak(t) {
    t = clean(t); if (!t) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t.replace(/\b(\d{1,2})\.(?=\s|$)/g, '$1').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ''));
      u.lang = 'de-DE'; u.rate = 0.85; speechSynthesis.speak(u);
    } catch (e) {}
  }

  function readHint() {
    var list = []; try { list = document.querySelectorAll(hintSel); } catch (e) {}
    for (var i = 0; i < list.length; i++) {
      var n = list[i], t = clean(n.innerText || n.textContent);
      if (t && !n.hidden && n.getClientRects().length) return t;
    }
    return '';
  }

  function close() { clearInterval(timer); timer = null; if (ov) ov.classList.remove('on'); }

  function run(help) {
    build(); if (!ov) return;
    clearInterval(timer);
    var sec = help ? T2 : T1, t0 = Date.now(), ms = sec * 1000;
    els.dpTitle.textContent = help ? '📖 Lies dir die Hilfe genau durch!' : 'Stopp! Erst denken, dann tippen.';
    els.dpSub.textContent = help ? 'Danach versuchst du es noch einmal.' : 'Schau dir die Aufgabe noch einmal genau an.';
    els.dpTxt.textContent = ''; hint = '';
    els.dpSpeak.style.display = 'none';
    els.dpOk.style.display = help ? '' : 'none'; els.dpOk.disabled = true;
    els.bar.style.width = '0';
    ov.classList.add('on');
    if (document.activeElement && document.activeElement.blur) try { document.activeElement.blur(); } catch (e) {}
    // Hinweis der App holen, sobald sie ihn angezeigt hat
    setTimeout(function () {
      hint = readHint();
      if (!hint && help) hint = 'Lies die Aufgabe noch einmal Wort für Wort. Wenn es einen Hilfe-Knopf gibt (💡 oder ❓), tippe ihn an.';
      els.dpTxt.textContent = hint; els.dpSpeak.style.display = hint ? '' : 'none';
    }, 120);
    var tick = function () {
      var el = Date.now() - t0, p = Math.min(1, el / ms), left = Math.max(0, Math.ceil((ms - el) / 1000));
      els.bar.style.width = (p * 100) + '%';
      if (help) {
        if (p < 1) els.dpOk.textContent = '⏳ noch ' + left + ' Sekunde' + (left === 1 ? '' : 'n');
        else { els.dpOk.textContent = 'Ich habe es gelesen ✓'; els.dpOk.disabled = false; clearInterval(timer); }
      } else if (p >= 1) close();
    };
    tick(); timer = setInterval(tick, 200);
  }

  var DP = {
    wrong: function () { if (!isOn()) return; tries++; run(tries >= 2); },
    right: function () { var e = !isOn() || tries < 2; return e; },   // Stern verdient?
    earned: function () { return !isOn() || tries < 2; },
    reset: function () { tries = 0; },
    tries: function () { return tries; },
    isOn: isOn,
    busy: function () { return !!(ov && ov.classList.contains('on')); },
    NOSTAR: ' Diesmal gibt es keinen Stern. Den Stern bekommst du, wenn du es beim 1. oder 2. Versuch schaffst.'
  };
  window.DP = DP;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();

  // An LernLog anhängen (alle Apps melden dort neue Aufgaben und falsche Versuche)
  var L = window.LernLog;
  if (L) {
    var oStart = L.start, oFehler = L.fehler;
    L.start = function () { tries = 0; return oStart.apply(this, arguments); };
    L.fehler = function () {
      var active = L.aktiv ? L.aktiv() : true;
      var r = oFehler.apply(this, arguments);
      if (active) DP.wrong();
      return r;
    };
  }
})();
