/* =====================================================================
   Übungswahl – Erwachsene schalten Übungen aus, die das Kind sicher kann.
   Ausgeschaltete Übungen verschwinden aus der Auswahl der App.
   Außerdem: Die Einstellungen der App (⚙️) gehen nur noch mit der PIN
   aus dem Lernstand auf (sonst könnte das Kind z. B. das Spiel freischalten).

   Einbinden (am Ende von <body>):
     <script src="uebungswahl.js" data-app="Parallel-Profi" data-items="Übungen=.mode"></script>
   data-items: Gruppen „Überschrift=CSS-Selektor“, mehrere mit „;“ getrennt,
               z. B. "Stufen=.stg;Übungen=.mode"
   data-gate:  zusätzliche Knöpfe, die nur mit PIN aufgehen (Standard: übliche ⚙️-Knöpfe)
   data-vorlesen="an": Aufträge werden in dieser App weiter automatisch vorgelesen
               (Standard: aus – vorgelesen wird nur, wenn das Kind auf 🔊 tippt)
   Gespeichert wird auf dem Gerät (localStorage von bellie161.github.io).
   ===================================================================== */
(function () {
  if (window.Uebungswahl) return;
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var APP = ds.app || document.title || location.pathname;
  var GROUPS = String(ds.items || '').split(';').map(function (g) {
    var i = g.indexOf('='); if (i < 0) return null;
    return { t: g.slice(0, i).trim(), sel: g.slice(i + 1).trim() };
  }).filter(function (g) { return g && g.sel; });
  var GATE = ds.gate || '#setBtn,#btn-settings,#openSettings,#btnSettings,#btnLehrer,#hold';
  var VKEY = 'uebungswahl.vorlesen', VDEF = ds.vorlesen === 'an';
  var EKEY = 'uebungswahl.erklaer', HAS_E = ds.erklaer === '1'; // Erklärung vor jeder Übung (sonst nur beim ersten Mal)
  function erklImmer() { try { var m = JSON.parse(ls(EKEY) || '{}'); return !!m[APP]; } catch (e) { return false; } }
  function setErkl(v) { var m = {}; try { m = JSON.parse(ls(EKEY) || '{}') || {}; } catch (e) {} m[APP] = !!v; ls(EKEY, JSON.stringify(m)); }
  var KEY = 'uebungswahl.v1', PKEY = 'lernlog.pin', OKEY = 'uebungswahl.offen', OPEN_MS = 10 * 60 * 1000;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function all() { try { return JSON.parse(ls(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function off() { var a = all(); return a[APP] || {}; }
  function setOff(k, v) { var a = all(), o = a[APP] || {}; if (v) o[k] = 1; else delete o[k]; a[APP] = o; ls(KEY, JSON.stringify(a)); }
  function isOpen() { try { return Date.now() < +(sessionStorage.getItem(OKEY) || 0); } catch (e) { return false; } }
  function setOpen(on) { try { if (on) sessionStorage.setItem(OKEY, String(Date.now() + OPEN_MS)); else sessionStorage.removeItem(OKEY); } catch (e) {} }

  /* ---------- Übungen erkennen ---------- */
  function label(el) {
    var parts = [], wk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = wk.nextNode())) {
      if (n.parentNode && n.parentNode.closest && n.parentNode.closest('svg')) continue;
      parts.push(n.nodeValue);
    }
    var t = parts.join(' ').replace(/\s+/g, ' ').trim();
    t = t.split(/⭐|🔒|\d+\s*von\s*\d+|\bNeu\b/)[0].replace(/(\d+ )?\d+ Euro|\d+ €/g, '').replace(/^[·•]\s*|[·•]\s*$/g, '').replace(/\s+/g, ' ').trim();
    return t || el.getAttribute('aria-label') || '?';
  }
  function keyOf(el) {
    var d = el.dataset, ks = Object.keys(d).filter(function (k) { return !/^uw/.test(k); }).sort();
    if (ks.length) return ks.map(function (k) { return k + '=' + d[k]; }).join('&');
    return 't:' + label(el);
  }
  function items(g) { return [].slice.call(document.querySelectorAll(g.sel)).filter(function (e) { return !e.closest('#uwOv'); }); }
  function visible(el) { return !!(el.offsetParent || el.getClientRects().length); }
  function selected(el) { return el.classList.contains('sel') || el.classList.contains('on') || el.getAttribute('aria-pressed') === 'true'; }
  function locked(el) { return el.disabled || el.classList.contains('lock') || el.classList.contains('locked'); }

  /* ---------- Ausblenden ---------- */
  var st = document.createElement('style');
  st.textContent = '.uw-aus{display:none!important}' +
    '#uwBtn{position:fixed;right:10px;bottom:10px;z-index:9998;width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,.85);box-shadow:0 2px 6px rgba(0,0,0,.2);font-size:20px;opacity:.6;cursor:pointer;display:none;padding:0}' +
    '#uwOv{position:fixed;inset:0;z-index:99998;background:rgba(20,30,50,.5);display:flex;align-items:center;justify-content:center;font:16px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1F2A37}' +
    '#uwOv .c{background:#fff;border-radius:22px;padding:20px 22px;width:min(560px,94vw);max-height:92vh;overflow-y:auto;box-shadow:0 10px 30px rgba(0,0,0,.3)}' +
    '#uwOv h2{margin:0 0 4px;font-size:24px}#uwOv p{margin:4px 0 12px;color:#4b5563}' +
    '#uwOv .dots{display:flex;gap:12px;justify-content:center;margin:14px 0}#uwOv .dots i{width:16px;height:16px;border-radius:50%;border:2px solid #0F8B8D}#uwOv .dots i.f{background:#0F8B8D}' +
    '#uwOv .pad{display:grid;grid-template-columns:repeat(3,72px);gap:10px;justify-content:center}' +
    '#uwOv button{font:inherit;font-weight:700;border:none;border-radius:14px;cursor:pointer;touch-action:manipulation}' +
    '#uwOv .pad button{height:60px;font-size:24px;background:#EEF2F7;color:#1F2A37}' +
    '#uwOv .msg{color:#E63946;text-align:center;min-height:22px;font-weight:700}' +
    '#uwOv h3{margin:14px 0 4px;font-size:17px;color:#0F8B8D}' +
    '#uwOv label{display:flex;align-items:center;gap:12px;padding:9px 4px;border-bottom:1px solid #eef0f3;cursor:pointer;font-size:18px}' +
    '#uwOv label span{flex:1}#uwOv label.aus span{color:#9aa5b1;text-decoration:line-through}' +
    '#uwOv input{appearance:none;-webkit-appearance:none;flex:none;width:54px;height:30px;border-radius:15px;background:#cbd2d9;position:relative;cursor:pointer;margin:0}' +
    '#uwOv input:before{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:left .15s}' +
    '#uwOv input:checked{background:#2A9D4B}#uwOv input:checked:before{left:27px}' +
    '#uwOv .row{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px}' +
    '#uwOv .ok{background:#2A9D4B;color:#fff;padding:12px 20px}#uwOv .lt{background:#EEF2F7;color:#1F2A37;padding:12px 16px}' +
    '#uwOv .hint{font-size:14px;color:#6b7280;margin-top:10px}';
  (document.head || document.documentElement).appendChild(st);

  var applying = false;
  function apply() {
    if (applying) return; applying = true;
    try {
      var o = off(), any = false;
      GROUPS.forEach(function (g) {
        var list = items(g), hiddenSel = null;
        list.forEach(function (el) {
          var aus = !!o[keyOf(el)];
          if (el.classList.contains('uw-aus') !== aus) el.classList.toggle('uw-aus', aus);
          if (aus && selected(el)) hiddenSel = el;
          if (!aus && visible(el)) any = true;
        });
        if (hiddenSel) { // die gewählte Stufe/Übung ist aus: nächste freie wählen
          var nx = list.filter(function (e) { return !e.classList.contains('uw-aus') && !locked(e); })[0];
          if (nx) setTimeout(function () { nx.click(); }, 0);
        }
      });
      var b = document.getElementById('uwBtn');
      var dsp = any && !document.getElementById('uwOv') ? 'block' : 'none'; if (b && b.style.display !== dsp) b.style.display = dsp;
    } finally { applying = false; }
  }

  /* ---------- PIN ---------- */
  function overlay(html) {
    close(); var ov = document.createElement('div'); ov.id = 'uwOv'; ov.innerHTML = '<div class="c">' + html + '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov); apply(); return ov;
  }
  function close() { var o = document.getElementById('uwOv'); if (o) o.remove(); setTimeout(apply, 0); }
  function askPin(then, why) {
    var saved = ls(PKEY), mode = saved ? 'check' : 'new', first = '', pin = '';
    var ov = overlay('<h2>🔒 Für Erwachsene</h2><p class="sub"></p><div class="dots"><i></i><i></i><i></i><i></i></div><div class="msg"></div><div class="pad"></div>' +
      '<div class="row"><button class="lt" data-x="1">Abbrechen</button></div>');
    var sub = ov.querySelector('.sub'), dots = ov.querySelectorAll('.dots i'), msg = ov.querySelector('.msg');
    function ui() {
      sub.textContent = (why ? why + ' ' : '') + (mode === 'check' ? 'Bitte die PIN vom Lernstand eingeben.' : mode === 'new' ? 'Noch keine PIN festgelegt. Neue PIN (4 Ziffern):' : 'PIN noch einmal eingeben:');
      [].forEach.call(dots, function (d, i) { d.className = i < pin.length ? 'f' : ''; });
    }
    ov.querySelector('.pad').innerHTML = ['1','2','3','4','5','6','7','8','9','','0','⌫'].map(function (k) { return k ? '<button data-k="' + k + '">' + k + '</button>' : '<span></span>'; }).join('');
    ov.querySelector('[data-x]').onclick = close;
    ov.querySelector('.pad').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; msg.textContent = '';
      if (b.dataset.k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += b.dataset.k;
      ui(); if (pin.length < 4) return;
      setTimeout(function () {
        if (mode === 'check') { if (pin === ls(PKEY)) { setOpen(true); close(); then(); return; } msg.textContent = 'Falsche PIN.'; }
        else if (mode === 'new') { first = pin; mode = 'repeat'; }
        else { if (pin === first) { ls(PKEY, pin); setOpen(true); close(); then(); return; } msg.textContent = 'Die PINs waren verschieden.'; mode = 'new'; }
        pin = ''; ui();
      }, 120);
    });
    ui();
  }
  function withPin(fn, why) { if (isOpen()) fn(); else askPin(fn, why); }

  /* ---------- Übungen ein-/ausschalten ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function panel() {
    var o = off(), h = '<h2>Übungen ein- und ausschalten</h2><p>' + esc(APP) + ': Ausgeschaltete Übungen sieht das Kind nicht mehr. Schalte aus, was es schon sicher kann.</p>' +
      '<h3>Vorlesen</h3><label class="' + (autoRead() ? '' : 'aus') + '"><span>Aufträge automatisch vorlesen<br><small style="color:#6b7280;font-size:14px">Aus: Das Kind liest selbst und tippt bei Bedarf auf 🔊.</small></span><input type="checkbox" data-vor="1"' + (autoRead() ? ' checked' : '') + '></label>' +
      (HAS_E ? '<h3>Erklärung</h3><label class="' + (erklImmer() ? '' : 'aus') + '"><span>Erklärung vor jeder Übung zeigen<br><small style="color:#6b7280;font-size:14px">Aus: Die Erklärung kommt nur beim ersten Mal. Danach mit ❓.</small></span><input type="checkbox" data-erkl="1"' + (erklImmer() ? ' checked' : '') + '></label>' : '');
    GROUPS.forEach(function (g, gi) {
      var seen = {}, list = items(g).filter(function (el) { var k = keyOf(el); if (seen[k]) return false; seen[k] = 1; return true; });
      if (!list.length) return;
      if (GROUPS.length > 1) h += '<h3>' + esc(g.t) + '</h3>';
      list.forEach(function (el) {
        var k = keyOf(el), on = !o[k];
        h += '<label class="' + (on ? '' : 'aus') + '"><span>' + esc(label(el)) + '</span><input type="checkbox" data-g="' + gi + '" data-k="' + esc(k) + '"' + (on ? ' checked' : '') + '></label>';
      });
    });
    h += '<div class="msg"></div><div class="row"><button class="lt" data-lock="1">🔒 Sperren</button><button class="ok" data-x="1">Fertig</button></div>' +
      '<div class="hint">Die Einstellung gilt nur auf diesem iPad. Die Einstellungen ⚙️ der App sind 10 Minuten lang ohne PIN offen, danach wieder gesperrt.</div>';
    var ov = overlay(h), msg = ov.querySelector('.msg');
    ov.querySelector('[data-x]').onclick = close;
    ov.querySelector('[data-lock]').onclick = function () { setOpen(false); close(); };
    var vor = ov.querySelector('input[data-vor]');
    vor.onchange = function () { setAutoRead(vor.checked); vor.parentNode.className = vor.checked ? '' : 'aus'; };
    var ek = ov.querySelector('input[data-erkl]');
    if (ek) ek.onchange = function () { setErkl(ek.checked); ek.parentNode.className = ek.checked ? '' : 'aus'; };
    [].forEach.call(ov.querySelectorAll('input[data-k]'), function (inp) {
      inp.onchange = function () {
        var grp = [].slice.call(ov.querySelectorAll('input[data-g="' + inp.dataset.g + '"]'));
        if (!inp.checked && !grp.some(function (x) { return x.checked; })) { inp.checked = true; msg.textContent = 'Mindestens eine Übung muss an bleiben.'; return; }
        msg.textContent = '';
        setOff(inp.dataset.k, !inp.checked);
        inp.parentNode.className = inp.checked ? '' : 'aus';
        var g = GROUPS[+inp.dataset.g], o2 = off();
        var frei = items(g).some(function (el) { return !o2[keyOf(el)] && !locked(el); });
        if (!frei) msg.textContent = 'Die übrigen ' + g.t + ' sind noch gesperrt (🔒). Du kannst sie unter ⚙️ freischalten, z. B. mit „Alle Stufen freischalten“.';
      };
    });
  }

  /* ---------- Einstellungen der App nur mit PIN ---------- */
  function gate(e) {
    var t = e.target && e.target.closest && e.target.closest(GATE);
    if (!t || isOpen() || (e.target.closest && e.target.closest('#uwOv'))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === 'click' || e.type === 'pointerdown') {
      if (gate.busy) return; gate.busy = true; setTimeout(function () { gate.busy = false; }, 600);
      askPin(function () { if (t.id !== 'hold') setTimeout(function () { t.click(); }, 50); }, 'Die Einstellungen sind gesperrt.');
    }
  }
  ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function (ev) { document.addEventListener(ev, gate, { capture: true, passive: false }); });

  /* ---------- Vorlesen nur auf Wunsch (🔊) ---------- */
  function autoRead() { try { var m = JSON.parse(ls(VKEY) || '{}'); return APP in m ? !!m[APP] : VDEF; } catch (e) { return VDEF; } }
  function setAutoRead(v) { var m = {}; try { m = JSON.parse(ls(VKEY) || '{}') || {}; } catch (e) {} m[APP] = !!v; ls(VKEY, JSON.stringify(m)); }
  var SPK = '#speakBtn,#sSpeak,#merkSpeak,#speak,#sayq,#btn-speak,#btnSay,#btnVorlesen,#bigPlay,.speak,.say,.listen-btn,.btn-reread';
  var lastAsk = 0;
  function isSpeaker(b) {
    if (!b || b.closest('#uwOv')) return false;
    if (b.matches(SPK)) return true;
    var t = (b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '');
    return /🔊|vorlesen|anhören|abspielen|hör gut zu|nochmal hören/i.test(t);
  }
  ['pointerdown', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { var b = e.target && e.target.closest && e.target.closest('button,[role=button],a'); if (isSpeaker(b)) lastAsk = Date.now(); }, true);
  });
  try {
    var SS = window.speechSynthesis;
    if (SS && SS.speak) {
      var orig = SS.speak.bind(SS);
      SS.speak = function (u) {
        if (autoRead() || Date.now() - lastAsk < 3000) return orig(u);
        setTimeout(function () { try { u.dispatchEvent(new Event('end')); } catch (e) {} }, 0); // Apps, die auf das Ende warten, laufen weiter
      };
    }
  } catch (e) {}

  /* ---------- Start ---------- */
  function start() {
    if (GROUPS.length) {
      var b = document.createElement('button'); b.id = 'uwBtn'; b.type = 'button'; b.title = 'Übungen ein- und ausschalten (für Erwachsene)'; b.textContent = '🔒';
      b.onclick = function () { withPin(panel, 'Übungen ein- und ausschalten.'); };
      document.body.appendChild(b);
      var mo = new MutationObserver(function () { if (!applying) { clearTimeout(start.t); start.t = setTimeout(apply, 30); } });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-pressed'] });
      setInterval(apply, 1500);
    }
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.Uebungswahl = { apply: apply, offen: isOpen, erklaerImmer: erklImmer };
})();
