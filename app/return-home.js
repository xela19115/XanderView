/* Optional return to XanderView when Samsung Home becomes foreground. */
(function () {
  'use strict';
  var KEY = 'cleanframe.return-home.v1', SELF = 'XanderView.XanderView';
  var on = false, until = 0, homeSince = 0, lastLaunch = 0, worker = null, interval = null;
  try { var saved = localStorage.getItem(KEY); if (saved === 'off') on = false; else if (saved === 'on') on = true; } catch (ignore) {}
  function pause(ms) { until = Math.max(until, Date.now() + ms); homeSince = 0; }
  function tick() {
    var now = Date.now(), id;
    if (!on || !document.hidden || now < until || !window.tizen || !tizen.application ||
        !window.webapis || !webapis.appcommon || typeof webapis.appcommon.getForegroundAppId !== 'function') {
      homeSince = 0; return;
    }
    try { id = webapis.appcommon.getForegroundAppId(); } catch (ignore) { homeSince = 0; return; }
    if (id !== 'com.samsung.tv.csfs') { homeSince = 0; return; }
    if (!homeSince) { homeSince = now; return; }
    if (now - homeSince < 800 || now - lastLaunch < 5000) return;
    lastLaunch = now; homeSince = 0;
    try { tizen.application.launch(SELF, function () {}, function () {}); } catch (ignore) {}
  }
  function start() {
    if (!window.tizen || !tizen.application) return;
    try { worker = new Worker('return-home-worker.js'); worker.onmessage = tick; }
    catch (ignore) { interval = setInterval(tick, 500); }
  }
  window.XanderViewReturnHome = {
    enabled: function () { return on; },
    setEnabled: function (value) { localStorage.setItem(KEY, value ? 'on' : 'off'); on = !!value; homeSince = 0; },
    pause: pause
  };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { until = 0; homeSince = 0; } });
  if (window.location.protocol === 'file:' && !window.webapis) {
    var script = document.createElement('script');
    script.src = '$WEBAPIS/webapis/webapis.js';
    document.head.appendChild(script);
  }
  start();
}());
