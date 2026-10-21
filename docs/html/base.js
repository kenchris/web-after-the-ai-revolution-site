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
  sty.textContent = 'html,body{touch-action:none;-webkit-tap-highlight-color:transparent}*{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none}';
  document.head.appendChild(sty);
  var KEYS = ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','PageDown','PageUp','Home','End',' ','Enter','Backspace','Escape','f','F','g','G','v','V','Tab'];
  addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (pfs && e.key === 'Escape') { e.preventDefault(); toggleVideo(); return; }
    if (KEYS.indexOf(e.key) < 0) return;
    e.preventDefault(); post({ k: e.key, shift: e.shiftKey });
  });
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function lockLandscape() { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (x) {} }
  // When the presentation itself is already full screen, the video fills the slide instead of asking for a second full screen,
  // so the presentation never leaves full screen. The player knows (pfs) and a tap outside the video closes it.
  var pfs = false, viaFull = false, warned = false;
  // half a second before the end the player loads the next slide out of sight, so it shows at once when the video is over
  document.addEventListener('timeupdate', function (e) {
    var v = e.target; if (!viaFull || !v || v.tagName !== 'VIDEO' || !(v.duration > 0)) return;
    if (v.duration - v.currentTime > 0.5) { warned = false; return; }
    if (!warned) { warned = true; post({ preload: 1 }); }
  }, true);
  var psty = document.createElement('style');
  psty.textContent = '.vvid.pfs{position:fixed!important;left:0!important;top:0!important;width:1920px!important;height:1080px!important;z-index:99999;border-radius:0!important;object-fit:contain;background:#000}';
  document.head.appendChild(psty);
  // full screen by the player's own button, or by the browser (F11, an installed app): the window then fills the whole screen
  function pageFs() {
    try {
      var w = window.parent, d = w.document;
      if (d.fullscreenElement || d.webkitFullscreenElement) return true;
      if (w.matchMedia && w.matchMedia('(display-mode: fullscreen)').matches) return true;
      return w.innerWidth >= screen.width - 1 && w.innerHeight >= screen.height - 1;
    } catch (x) { return false; }
  }
  function setPfs(v, on) { pfs = on; v.classList.toggle('pfs', on); post({ pfs: on ? 1 : 0 }); }
  function playFull(v) {
    if (!v) return false;
    viaFull = true;
    v.controls = true;
    if (pageFs()) { setPfs(v, true); var q = v.play(); if (q && q.catch) q.catch(function () {}); dbg('video fills the slide'); return true; }
    var p = v.play(); if (p && p.catch) p.catch(function () {});
    var alt = function (why) { dbg('full screen refused: ' + why); if (v.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); dbg('using the phone video player'); } catch (x) { dbg('no full screen possible: ' + x); } } };
    var rq = v.requestFullscreen || v.webkitRequestFullscreen;
    if (rq) { try { var r = rq.call(v); if (r && r.then) r.then(lockLandscape, function (err) { alt(err && err.message || err); }); else lockLandscape(); } catch (x) { alt(x); } }
    else alt('this browser has no full screen for a video element');
    return true;
  }
  window.__playFull = playFull;
  function toggleVideo() {
    var v = document.querySelector('video.vvid'); if (!v) return;
    if (pfs) { viaFull = false; v.pause(); setPfs(v, false); rewind(); }
    else if (fsEl()) { viaFull = false; (document.exitFullscreen || document.webkitExitFullscreen).call(document); v.pause(); }
    else playFull(v);
  }
  addEventListener('message', function (e) { if (e.data && e.data.cmd === 'video') toggleVideo(); });
  // when the video ends it leaves full screen by itself and the slide is back (the ended event does not bubble, so listen while capturing)
  document.addEventListener('ended', function (e) {
    if (e.target && e.target.tagName === 'VIDEO' && viaFull) { viaFull = false; post({ k: 'ArrowRight' }); }   // a video played full screen ends on the next slide (already loaded behind the scenes, see timeupdate)
    if (e.target && e.target.tagName === 'VIDEO' && pfs) { setPfs(e.target, false); return; }
    if (!e.target || e.target.tagName !== 'VIDEO' || !fsEl()) return;
    var ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) { try { var r = ex.call(document); if (r && r.catch) r.catch(function () {}); } catch (x) {} }
  }, true);
  function onFs() { if (!fsEl()) { viaFull = false; try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (x) {} } }
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
  // a tap on the video of a video slide plays it full screen (on a touch screen; with a mouse the video plays in place)
  // On a touch screen the video has no controls of its own while it sits in the slide (they would take the tap and only offer a small play button);
  // the tap starts it full screen, where the controls are on.
  function setControls() { var v = document.querySelector('video.vvid'); if (v) v.controls = !!fsEl() || pfs; }
  // when the video is over or full screen is left, show the first picture again (an ended video on a phone can come back blank)
  function rewind() {
    var v = document.querySelector('video.vvid'); if (!v) return;
    setTimeout(function () {
      if (fsEl() || pfs) return;
      try { v.pause(); v.currentTime = 0.01; } catch (x) {}
      v.style.display = 'none'; void v.offsetHeight; v.style.display = ''; setControls();
    }, 250);
  }
  document.addEventListener('ended', function (e) { if (e.target && e.target.tagName === 'VIDEO') rewind(); }, true);
  document.addEventListener('fullscreenchange', function () { if (!fsEl()) rewind(); });
  document.addEventListener('webkitfullscreenchange', function () { if (!fsEl()) rewind(); });
  document.addEventListener('webkitendfullscreen', rewind, true);
  setControls(); document.addEventListener('DOMContentLoaded', setControls); addEventListener('load', setControls); document.addEventListener('fullscreenchange', setControls); document.addEventListener('webkitfullscreenchange', setControls);
  var vx, vy, vt = 0, lastTouch = 0;
  document.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { vx = e.screenX; vy = e.screenY; vt = Date.now(); } }, true);
  document.addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'touch' || fsEl() || pfs) return;
    lastTouch = Date.now();
    var v = e.target && e.target.closest && e.target.closest('video'); if (!v) return;
    if (Math.abs(e.screenX - vx) > 18 || Math.abs(e.screenY - vy) > 18 || Date.now() - vt > 700) return;
    playFull(v); dbg('tap video: full screen');
  }, true);
  document.addEventListener('click', function (e) {
    var v = e.target && e.target.closest && e.target.closest('video'); if (!v || fsEl() || pfs || Date.now() - lastTouch < 800) return;
    e.preventDefault(); e.stopPropagation(); playFull(v);
  }, true);
  // Taps and swipes on a touch screen: left third back, the rest forward, the top strip shows the buttons.
  // The slide is drawn about a third of its size on a phone, so how far a finger moved is measured in real screen
  // pixels (screenX, screenY), not in the slide's own pixels; touch-action none stops the browser taking a swipe as a scroll.
  // Both pointer events and touch events are listened to (some phone browsers are odd about one of them); a gesture is
  // acted on once. A selection or the long-press menu can no longer swallow taps. ?debug on the page address shows why a tap was ignored.
  function dbg(m) { post({ dbg: m }); }
  var lastAct = 0;
  function finish(dx, dy, dt, target, cx, cy, src) {
    var now = Date.now(); if (now - lastAct < 350) return;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { lastAct = now; post({ k: dx < 0 ? 'ArrowRight' : 'ArrowLeft' }); dbg('swipe ' + (dx < 0 ? 'next' : 'back') + ' (' + src + ')'); return; }
    var why = null;
    if (Math.abs(dx) > 18 || Math.abs(dy) > 18) why = 'finger moved ' + Math.round(Math.abs(dx)) + ',' + Math.round(Math.abs(dy)) + ' px';
    else if (dt > 700) why = 'held ' + dt + ' ms';
    else if (target && target.closest && target.closest('video')) why = 'tap on the video';
    if (why) { dbg('ignored: ' + why + ' (' + src + ')'); return; }
    lastAct = now;
    if (cy < 110) { post({ ui: 1 }); dbg('tap top: buttons (' + src + ')'); }
    else if (cx < 576) { post({ k: 'ArrowLeft' }); dbg('tap left: back (' + src + ')'); }
    else { post({ k: 'ArrowRight' }); dbg('tap: next (' + src + ')'); }
  }
  var sx, sy, t0 = null, tx, ty, tt = null;
  addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch' || !e.isPrimary) return; sx = e.screenX; sy = e.screenY; t0 = Date.now(); }, { passive: true });
  addEventListener('pointercancel', function () { if (t0 !== null) dbg('pointer cancelled by the browser'); t0 = null; });
  addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'touch' || t0 === null) return;
    var dt = Date.now() - t0, d0 = t0; t0 = null;
    finish(e.screenX - sx, e.screenY - sy, dt, e.target, e.clientX, e.clientY, 'pointer');
  });
  addEventListener('touchstart', function (e) { if (e.touches.length !== 1) { tt = null; return; } tx = e.touches[0].screenX; ty = e.touches[0].screenY; tt = Date.now(); }, { passive: true });
  addEventListener('touchend', function (e) {
    if (tt === null || !e.changedTouches.length) return;
    var c = e.changedTouches[0], dt = Date.now() - tt; tt = null;
    setTimeout(function () { finish(c.screenX - tx, c.screenY - ty, dt, e.target, c.clientX, c.clientY, 'touch'); }, 30);   // after the pointer events, which win
  }, { passive: true });
  function reset() { t0 = null; tt = null; }
  addEventListener('blur', reset); document.addEventListener('visibilitychange', reset);
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
})();
