/* =====================================================================
   Denkpause – Schutz gegen Durchklicken in den Lern-Apps.
   Nach einer falschen Antwort erscheint ein Tipp (wird vorgelesen) und
   ein Countdown. Erst danach darf das Kind es nochmal versuchen.
   Jede weitere falsche Antwort zur selben Aufgabe macht die Pause 5 s länger.

   Die Einstellung gilt für alle Apps (localStorage von bellie161.github.io):
     Pause: aus / 5 / 10 / 15 s  (Standard 10 s)
     Stern nur beim 1. Versuch: an / aus  (Standard an)
   Einstellbar im ⚙️-Fenster der Apps und in lernstand.html.

   Benutzen:  Denkpause.falsch('Tipp-Text', versuch);  // versuch = 1, 2, 3 …
              Denkpause.falsch('Tipp + Lösung', 2, {loesung:true}); // keine neue Chance, Knopf heißt „Weiter“
              {stumm:true}: nicht vorlesen (wenn die App gerade selbst etwas vorzählt)
              Denkpause.ersterVersuch()                 // true: Stern nur beim 1. Versuch
   ===================================================================== */
(function () {
  if (window.Denkpause) return;
  var KEY = 'denkpause.v1', MAXSEC = 30, timer = null;

  function get() {
    var d = { sek: 10, erst: true };
    try { var s = JSON.parse(localStorage.getItem(KEY) || '{}'); if (s.sek != null) d.sek = +s.sek; if (s.erst != null) d.erst = !!s.erst; } catch (e) {}
    return d;
  }
  function set(k, v) { var d = get(); d[k] = v; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  function speak(t) {
    if (typeof window.say === 'function') { try { window.say(t); return; } catch (e) {} }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t.replace(/(\d+)\.(?=\s|$)/g, '$1 ')); u.lang = 'de-DE'; u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function css() {
    if (document.getElementById('dpStyle')) return;
    var s = document.createElement('style'); s.id = 'dpStyle';
    s.textContent =
      '#dpOv{position:fixed;inset:0;z-index:99990;background:rgba(31,42,55,.10);display:none;align-items:flex-end;justify-content:center;padding:8px;font-family:"Trebuchet MS",system-ui,sans-serif}' +
      '#dpOv.on{display:flex}' +
      '#dpOv .dpc{background:#fff;border:4px solid #F28C28;border-radius:24px;max-width:760px;width:100%;padding:10px 16px;display:flex;gap:14px;align-items:center;box-shadow:0 10px 34px rgba(0,0,0,.28);animation:dpIn .25s ease-out}' +
      '@keyframes dpIn{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}' +
      '#dpOv .dpn{flex:0 0 auto;width:72px;height:72px;border-radius:50%;background:#FDECEC;color:#E63946;font-size:36px;font-weight:700;display:flex;align-items:center;justify-content:center}' +
      '#dpOv .dpm{flex:1 1 auto;min-width:0;text-align:left}' +
      '#dpOv h2{margin:0 0 2px;font-size:22px;color:#F28C28}' +
      '#dpOv .dpt{font-size:20px;line-height:1.3;color:#1F2A37;max-height:22vh;overflow:auto}' +
      '#dpOv .dps{font-size:14px;color:#6b7280;margin:2px 0 6px}' +
      '#dpOv .dpr{display:flex;gap:10px;flex-wrap:wrap}' +
      '#dpOv button{font:inherit;font-weight:700;font-size:19px;border:none;border-radius:14px;padding:8px 14px;cursor:pointer}' +
      '#dpOv .dpl{background:#EEF2F7;color:#1F2A37}#dpOv .dpg{background:#2A9D4B;color:#fff;font-size:22px}' +
      '.dpSet{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:10px 0;text-align:left}' +
      '.dpSet small{color:#6b7280;font-size:15px}.dpSeg{display:inline-flex;gap:6px}' +
      '.dpSeg button{font:inherit;font-weight:700;font-size:17px;border:2px solid #cbd5e1;background:#fff;color:#1F2A37;border-radius:12px;padding:6px 12px;cursor:pointer}' +
      '.dpSeg button.sel{background:#8E44AD;border-color:#8E44AD;color:#fff}';
    document.head.appendChild(s);
  }

  function overlay() {
    var ov = document.getElementById('dpOv'); if (ov) return ov;
    css();
    ov = document.createElement('div'); ov.id = 'dpOv';
    ov.innerHTML = '<div class="dpc"><div class="dpn"></div><div class="dpm"><h2>🤔 Denkpause</h2><div class="dpt"></div>' +
      '<div class="dps">Schau dir die Aufgabe und den Tipp in Ruhe an. Raten lohnt sich nicht – jede falsche Antwort macht die Pause länger.</div>' +
      '<div class="dpr"><button type="button" class="dpl">🔊 Nochmal vorlesen</button><button type="button" class="dpg" style="display:none">Jetzt nochmal versuchen ➜</button></div></div></div>';
    // Klicks dürfen nicht zur App darunter durchgehen
    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function (ev) { ov.addEventListener(ev, function (e) { e.stopPropagation(); }, false); });
    ov.querySelector('.dpl').onclick = function () { speak(ov.querySelector('.dpt').textContent); };
    ov.querySelector('.dpg').onclick = function () { ov.classList.remove('on'); if (!this.dataset.l) speak('Versuch es nochmal.'); else try { speechSynthesis.cancel(); } catch (e) {} };
    document.body.appendChild(ov);
    return ov;
  }

  /* Falsche Antwort. Gibt true zurück, wenn eine Pause gezeigt wird. */
  function falsch(text, versuch, opt) {
    opt = opt || {};
    var d = get(); text = String(text || 'Schau nochmal genau hin.').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;|\u202f|\u2009/g, ' ').replace(/\s+/g, ' ').trim();
    if (!d.sek) { speak(text + ' Versuch es nochmal.'); return false; }
    var sek = Math.min(MAXSEC, d.sek + 5 * Math.max(0, (versuch || 1) - 1));
    var ov = overlay(), n = ov.querySelector('.dpn'), go = ov.querySelector('.dpg');
    clearInterval(timer);
    go.textContent = opt.loesung ? 'Weiter ➜' : 'Jetzt nochmal versuchen ➜'; go.dataset.l = opt.loesung ? '1' : '';
    ov.querySelector('.dpt').textContent = text; n.textContent = sek; go.style.display = 'none';
    ov.classList.add('on');
    if (!opt.stumm) speak('Denkpause. ' + text);
    var r = sek;
    timer = setInterval(function () { r--; n.textContent = r > 0 ? r : '✓'; if (r <= 0) { clearInterval(timer); go.style.display = ''; } }, 1000);
    return true;
  }
  function aktiv() { var ov = document.getElementById('dpOv'); return !!(ov && ov.classList.contains('on')); }

  /* Einstellungs-Zeilen in einen Container einfügen (vor das Element "vor", falls angegeben) */
  function einstellungen(box, vor) {
    if (!box || box.querySelector('.dpBox')) return;
    css();
    var w = document.createElement('div'); w.className = 'dpBox';
    w.innerHTML =
      '<div class="dpSet"><span>Denkpause nach falscher Antwort<br><small>gilt für alle Apps · bei jedem weiteren Fehler 5 s länger</small></span>' +
      '<span class="dpSeg" data-k="sek"><button data-v="0">aus</button><button data-v="5">5 s</button><button data-v="10">10 s</button><button data-v="15">15 s</button></span></div>' +
      '<div class="dpSet"><span>Stern nur beim 1. Versuch<br><small>Raten bringt keinen Stern</small></span>' +
      '<span class="dpSeg" data-k="erst"><button data-v="1">an</button><button data-v="0">aus</button></span></div>';
    function upd() {
      var d = get();
      w.querySelectorAll('.dpSeg').forEach(function (sg) {
        var k = sg.dataset.k, cur = k === 'erst' ? (d.erst ? '1' : '0') : String(d.sek);
        sg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', b.dataset.v === cur); });
      });
    }
    w.querySelectorAll('.dpSeg button').forEach(function (b) {
      b.onclick = function (e) { e.preventDefault(); var k = b.parentNode.dataset.k; set(k, k === 'erst' ? b.dataset.v === '1' : +b.dataset.v); upd(); };
    });
    upd();
    if (vor && vor.parentNode === box) box.insertBefore(w, vor); else box.appendChild(w);
  }

  // Automatisch ins ⚙️-Fenster der Apps (#setOv) einhängen
  function auto() {
    var c = document.querySelector('#setOv .card');
    if (c) { var bs = c.querySelectorAll(':scope > button'); einstellungen(c, bs.length ? bs[bs.length - 1] : null); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();

  window.Denkpause = {
    falsch: falsch,
    aktiv: aktiv,
    ersterVersuch: function () { return get().erst; },
    einstellungen: einstellungen
  };
})();
