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

// web player: a slide that has focus (after a text selection) hands navigation keys to the player
if (window.parent !== window) addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','PageDown','PageUp','Home','End',' ','Enter','Backspace','Escape','f','F','g','G'].indexOf(e.key) < 0) return;
  e.preventDefault(); window.parent.postMessage({ k: e.key }, '*');
});
