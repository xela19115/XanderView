/* One installed app, with a saved choice of Home screen. */
(function () {
  'use strict';
  var key = 'cleanframe.launcher.style', alternative = /\/xanderview\/index\.html$/.test(window.location.pathname);
  function current() { try { return localStorage.getItem(key) === 'xanderview' ? 'xanderview' : 'cleanframe'; } catch (ignore) { return 'cleanframe'; } }
  window.LauncherStyle = {
    current: current,
    choose: function (value) {
      if (value !== 'cleanframe' && value !== 'xanderview') throw new Error('Unknown Home screen');
      localStorage.setItem(key, value);
      if ((value === 'xanderview') !== alternative) window.location.href = alternative ? '../index.html' : 'xanderview/index.html';
    }
  };
  if (!alternative && current() === 'xanderview') window.location.replace('xanderview/index.html');
}());
