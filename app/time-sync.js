/* Network time corrects the launcher display only; it never changes the TV clock. */
(function () {
  'use strict';
  var offset = 0, lastSuccess = 0, pending = false, listeners = [];
  var PERIOD = 30 * 60 * 1000, MAX_AGE = 24 * 60 * 60 * 1000;
  function now() { var t = Date.now(); return t + (lastSuccess && Math.abs(t - lastSuccess) < MAX_AGE ? offset : 0); }
  function sync() {
    if (pending || document.hidden) return;
    pending = true;
    var start = Date.now(), req = new XMLHttpRequest();
    function finish() { pending = false; }
    req.open('GET', 'https://timeapi.io/api/Time/current/zone?timeZone=UTC&nonce=' + start, true);
    req.timeout = 10000;
    req.onload = function () {
      var end = Date.now(), v, remote;
      finish();
      if (req.status !== 200 || end < start || end - start > 10000) return;
      try { v = JSON.parse(req.responseText); } catch (e) { return; }
      if (!v || v.timeZone !== 'UTC' || ![v.year,v.month,v.day,v.hour,v.minute,v.seconds,v.milliSeconds].every(function (n) { return typeof n === 'number' && isFinite(n); })) return;
      remote = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.seconds, v.milliSeconds);
      if (!isFinite(remote) || Math.abs(remote - end) > 86400000) return;
      offset = remote - ((start + end) / 2); lastSuccess = end;
      listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    };
    req.onerror = req.ontimeout = req.onabort = finish;
    try { req.send(); } catch (e) { finish(); }
  }
  window.FrameClock = { now: now, sync: sync, subscribe: function (fn) { listeners.push(fn); } };
  setInterval(function () { if (!lastSuccess || Date.now() - lastSuccess >= PERIOD || Date.now() < lastSuccess) sync(); }, 2 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && (!lastSuccess || Date.now() - lastSuccess >= PERIOD)) sync(); });
  sync();
}());
