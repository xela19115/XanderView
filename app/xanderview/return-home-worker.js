/* Background timer: the TV can heavily throttle timers on a hidden page. */
setInterval(function () { postMessage(0); }, 500);
