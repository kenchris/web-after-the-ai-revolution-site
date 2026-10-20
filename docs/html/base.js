// Shared by every slide. ?art=1 hides editable text (so the artwork can be rendered without it).
// ?meta=1 writes the geometry and styles of every [data-edit] element into <script id="meta">.
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('art')) document.documentElement.classList.add('art');
  function runs(node, out, inherit) {
    node.childNodes.forEach((c) => {
      if (c.nodeType === 3) {
        const t = c.textContent.replace(/\s+/g, ' ');
        if (t.trim() === '' && !t.length) return;
        const cs = getComputedStyle(c.parentElement);
        out.push({ t, color: cs.color, bold: parseInt(cs.fontWeight, 10) >= 600, mono: /Consolas|mono/i.test(cs.fontFamily) });
      } else if (c.nodeName === 'BR') {
        out.push({ t: '\n' });
      } else if (c.nodeType === 1) {
        runs(c, out, inherit);
      }
    });
    return out;
  }
  window.addEventListener('load', () => {
    if (!q.get('meta')) return;
    const items = [];
    document.querySelectorAll('[data-edit]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      let rs = runs(el, [], null);
      // trim the first and last whitespace
      if (rs.length) { rs[0].t = rs[0].t.replace(/^\s+/, ''); rs[rs.length - 1].t = rs[rs.length - 1].t.replace(/\s+$/, ''); }
      items.push({
        id: el.getAttribute('data-edit'), x: r.left, y: r.top, w: r.width, h: r.height,
        size: parseFloat(cs.fontSize), lh: cs.lineHeight === 'normal' ? parseFloat(cs.fontSize) * 1.2 : parseFloat(cs.lineHeight),
        align: cs.textAlign, spacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), runs: rs,
      });
    });
    const s = document.createElement('script');
    s.id = 'meta'; s.type = 'application/json'; s.textContent = JSON.stringify(items);
    document.body.appendChild(s);
  });
})();

// web player: the slide hands keys, taps and swipes to the player, and plays its video full screen on a tap
(function () {
  if (window.parent === window) return;
  var post = function (m) { window.parent.postMessage(m, '*'); };
  var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  var sty = document.createElement('style');
  sty.textContent = 'html,body{touch-action:manipulation;-webkit-tap-highlight-color:transparent}';
  document.head.appendChild(sty);
  var KEYS = ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','PageDown','PageUp','Home','End',' ','Enter','Backspace','Escape','f','F','g','G','v','V','Tab'];
  addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYS.indexOf(e.key) < 0) return;
    e.preventDefault(); post({ k: e.key, shift: e.shiftKey });
  });
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function lockLandscape() { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (x) {} }
  function playFull(v) {
    if (!v) return false;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
    var rq = v.requestFullscreen || v.webkitRequestFullscreen;
    if (rq) { try { var r = rq.call(v); if (r && r.then) r.then(lockLandscape, function () {}); else lockLandscape(); } catch (x) {} }
    else if (v.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); } catch (x) {} }
    return true;
  }
  function toggleVideo() {
    var v = document.querySelector('video.vvid'); if (!v) return;
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); v.pause(); }
    else playFull(v);
  }
  addEventListener('message', function (e) { if (e.data && e.data.cmd === 'video') toggleVideo(); });
  function onFs() { if (!fsEl()) { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (x) {} } }
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
  // a tap on the video of a video slide plays it full screen (on a touch screen; with a mouse the video plays in place)
  document.addEventListener('click', function (e) {
    var v = e.target && e.target.closest && e.target.closest('video'); if (!v || !coarse || fsEl()) return;
    e.preventDefault(); e.stopPropagation(); playFull(v);
  }, true);
  // taps and swipes on a touch screen: left third back, the rest forward, the top strip shows the buttons
  var sx, sy, t0 = null;
  addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch') return; sx = e.clientX; sy = e.clientY; t0 = Date.now(); }, { passive: true });
  addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'touch' || t0 === null) return;
    var dx = e.clientX - sx, dy = e.clientY - sy, dt = Date.now() - t0; t0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { post({ k: dx < 0 ? 'ArrowRight' : 'ArrowLeft' }); return; }
    if (Math.abs(dx) > 14 || Math.abs(dy) > 14 || dt > 450) return;
    if (e.target && e.target.closest && e.target.closest('video')) return;
    var sel = window.getSelection && String(window.getSelection()); if (sel) return;
    if (e.clientY < 110) post({ ui: 1 });
    else if (e.clientX < 576) post({ k: 'ArrowLeft' });
    else post({ k: 'ArrowRight' });
  });
})();
