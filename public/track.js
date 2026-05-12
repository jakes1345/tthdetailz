/**
 * Lightweight same-origin analytics → POST /api/track (SQLite on server).
 * Fails silently if API unreachable. No third-party trackers.
 */
(function () {
  var ENDPOINT = '/api/track';

  function post(payload) {
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'same-origin'
      }).catch(function () {});
    } catch (e) {}
  }

  window.tthTrack = function (event, metadata) {
    if (!event || typeof event !== 'string') return;
    var payload = { event: event };
    if (metadata && typeof metadata === 'object') payload.metadata = metadata;
    post(payload);
  };

  window.tthTrackPageView = function () {
    try {
      var path = window.location.pathname || '/';
      var key = 'tth_pv_' + path;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      window.tthTrack('page_view', {
        path: path.slice(0, 120),
        title: (document.title || '').slice(0, 120)
      });
    } catch (e) {
      window.tthTrack('page_view', {});
    }
  };
})();
