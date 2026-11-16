/* Pesadithi Lab: anonymous step counting. Sends only event names and simple labels (never amounts from your statement, names or messages).
   Switched on only when the page includes Plausible's script (window.plausible). Until then, nothing is sent anywhere. */
(function () {
  window.pdTrack = function (name, props) {
    try { if (typeof window.plausible === 'function') window.plausible(name, props ? { props } : undefined); } catch (e) { /* never break the page */ }
  };
})();
