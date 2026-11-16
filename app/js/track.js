/* Pesadithi Lab: anonymous step counting. Sends only event names and simple labels (never amounts from your statement, names or messages).
   Switched on only when the page includes Plausible's script (window.plausible). Until then, nothing is sent anywhere. */
(function () {
  window.pdTrack = function (name, props) {
    try { if (typeof window.plausible === 'function') window.plausible(name, props ? { props } : undefined); } catch (e) { /* never break the page */ }
  };
})();

// Keep "M-PESA" (and "M-PESA Ratiba") on one line wherever it appears, including text drawn later
(function () {
  var RX = /M-PESA(?: Ratiba)?|M-Pesa|M-Shwari/g, SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|TITLE|CODE|PRE)$/;
  function wrap(root) {
    if (!root || !document.createTreeWalker) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode; if (!p || !RX.test(n.nodeValue)) return NodeFilter.FILTER_REJECT; RX.lastIndex = 0;
        for (var e = p; e && e !== document.body; e = e.parentNode) {
          if (SKIP.test(e.nodeName) || e.namespaceURI === 'http://www.w3.org/2000/svg' || (e.classList && (e.classList.contains('nw') || e.id === 'dev'))) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(function (n) {
      var t = n.nodeValue, f = document.createDocumentFragment(), last = 0, m; RX.lastIndex = 0;
      while ((m = RX.exec(t))) {
        if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index)));
        var s = document.createElement('span'); s.className = 'nw'; s.textContent = m[0]; f.appendChild(s); last = m.index + m[0].length;
      }
      if (last < t.length) f.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(f, n);
    });
  }
  function start() {
    wrap(document.body);
    var q = false;
    new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; wrap(document.body); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
