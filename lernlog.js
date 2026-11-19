/* =====================================================================
   LernLog – zeichnet auf, wie ein Kind in den Lern-Apps arbeitet.
   Alle Daten bleiben auf diesem Gerät (localStorage von bellie161.github.io).
   Auswertung: lernstand.html (mit PIN).

   Einbinden:  <script src="https://bellie161.github.io/Leseapp/lernlog.js"></script>
   Benutzen:   LernLog.init('App-Name');
               LernLog.start('Übung', 'Aufgabe');   // neue Aufgabe beginnt
               LernLog.fehler('Antwort', 'Hinweis'); // falscher Versuch
               LernLog.hilfe('Tipp');                // Hilfe benutzt
               LernLog.fertig(true|false);           // gelöst / nicht gelöst (Lösung gezeigt)
               LernLog.abbruch();                    // Aufgabe verlassen
   Für die Geometrie-Apps gibt es LernLog.geo({...}), das sich selbst einhängt.
   ===================================================================== */
(function () {
  if (window.LernLog) return;
  var KEY = 'lernlog.v1', MAX = 40000, IDLE = 90000; // Pausen über 90 s zählen nicht als Übungszeit

  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.e)) return d; } catch (e) {}
    return { v: 1, e: [] };
  }
  function store(d) {
    if (d.e.length > MAX) d.e = d.e.slice(-MAX);
    try { localStorage.setItem(KEY, JSON.stringify(d)); }
    catch (e) { d.e = d.e.slice(Math.floor(d.e.length * 0.2)); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (_) {} }
  }
  function upsert(rec) {
    var d = load(), i, from = Math.max(0, d.e.length - 80);
    for (i = d.e.length - 1; i >= from; i--) if (d.e[i].id === rec.id) { d.e[i] = rec; store(d); return; }
    d.e.push(rec); store(d);
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clip(s, n) { s = s == null ? '' : String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  var app = null, sess = null, task = null, lastAct = Date.now(), visible = !document.hidden, lastErr = 0, noted = true;

  function tick() {
    var now = Date.now(), add = visible ? Math.min(Math.max(0, now - lastAct), IDLE) : 0;
    lastAct = now;
    if (sess) sess.ms += add;
    if (task) task.ms += add;
  }
  function saveSess() { if (sess && sess.ms > 0) upsert({ id: sess.id, typ: 's', app: app, t0: sess.t0, s: Math.round(sess.ms / 1000) }); }
  function rec(t, r) {
    return { id: t.id, typ: 'a', app: app, ue: t.ue, au: t.au, t0: t.t0, s: Math.round(t.ms / 1000),
             f: t.f, fa: t.fa, h: t.h, r: r };
  }
  function close(r) {
    if (!task) return;
    tick();
    var t = task; task = null;
    if (r === 'abbr' && t.f === 0 && t.h === 0 && t.ms < 5000) return; // nur kurz angesehen → nicht zählen
    upsert(rec(t, r)); saveSess();
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, tick, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { tick(); visible = false; saveSess(); }
    else { visible = true; lastAct = Date.now(); }
  });
  window.addEventListener('pagehide', function () { close('abbr'); tick(); saveSess(); });

  var L = {
    init: function (name) {
      if (app) return;
      app = name; lastAct = Date.now();
      sess = { id: uid(), t0: Date.now(), ms: 0 };
    },
    start: function (ue, au) {
      if (!app) return;
      if (task) close('abbr');
      tick();
      task = { id: uid(), ue: clip(ue, 70), au: clip(au, 160), t0: Date.now(), ms: 0, f: 0, fa: [], h: 0 };
    },
    fehler: function (antwort, info) {
      if (!task) return;
      tick(); task.f++; lastErr = Date.now();
      var a = clip(antwort, 60), i = clip(info, 140);
      if (task.fa.length < 6) { task.fa.push(a && i ? a + ' – ' + i : (a || i || '?')); noted = !!i; }
    },
    notiz: function (text) { // Fehlertext, der kurz nach einem Fehler angezeigt wird
      if (!task || noted || Date.now() - lastErr > 2500 || !task.fa.length) return;
      var k = task.fa.length - 1; task.fa[k] = (task.fa[k] === '?' ? '' : task.fa[k] + ' – ') + clip(text, 140); noted = true;
    },
    hilfe: function () { if (task) { tick(); task.h++; } },
    fertig: function (geloest) { if (task) close(geloest === false ? 'nein' : task.f ? 'spaet' : 'ok'); },
    abbruch: function () { close('abbr'); },
    aktiv: function () { return !!task; },

    /* Automatisches Einhängen in die Geometrie-Apps (newTask / win / sound / feedback) */
    geo: function (o) {
      L.init(o.app);
      var W = window;
      function modeName() {
        try {
          var m = o.modus(), b = document.querySelector('.mode[data-m="' + m + '"]');
          var parts = [], wk = b ? document.createTreeWalker(b, NodeFilter.SHOW_TEXT) : null, n;
          while (wk && (n = wk.nextNode())) {
            var x = n.nodeValue.replace(/[^\wäöüÄÖÜß?&:=+,.\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (/[A-Za-zäöüÄÖÜß]{2}/.test(x) || /^\d+$/.test(x)) parts.push(x);
          }
          var t = parts.join(' · ').replace(/^(\d+) · /, '$1 ');
          return t || ('Übung ' + m);
        } catch (e) { return 'Übung'; }
      }
      function taskText() {
        var a = ''; try { a = o.aufgabe() || ''; } catch (e) {}
        var st = document.getElementById('strip'); var s = st ? (st.innerText || st.textContent || '').replace(/\s+/g, ' ').trim() : '';
        return s ? a + ' [' + s + ']' : a;
      }
      function wrap(name, before, after) {
        var f = W[name]; if (typeof f !== 'function') return;
        W[name] = function () {
          try { before && before.apply(this, arguments); } catch (e) {}
          var r = f.apply(this, arguments);
          try { after && after.apply(this, arguments); } catch (e) {}
          return r;
        };
      }
      wrap('newTask', null, function () { L.start(modeName(), taskText()); });
      wrap('win', function () { L.fertig(true); });
      wrap('sound', function (k) { // Fehlerton = falscher Versuch (nicht bei Animationen nach richtiger Antwort)
        if (k === 'no' && !(o.gesperrt && o.gesperrt())) L.fehler('', '');
      });
      wrap('feedback', function (t, cls) { if (cls === 'try') L.notiz(t); });
      var lastHelp = 0; // Tipp-Knopf; automatische Tipps (Aufruf mit true) und Doppelzählungen ignorieren
      (o.hints || []).forEach(function (h) { wrap(h, function (auto) {
        if (auto === true || Date.now() - lastHelp < 1500) return; lastHelp = Date.now(); L.hilfe(); }); });
      var hb = document.getElementById('helpBtn'); if (hb) hb.addEventListener('click', function () { L.hilfe(); });
      var home = document.getElementById('homeBtn'); if (home) home.addEventListener('click', function () { L.abbruch(); });
    }
  };
  window.LernLog = L;
})();
