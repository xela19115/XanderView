const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
let time = 10000, foreground = 'com.samsung.tv.csfs', calls = 0, callback, visible;
const storage = {};
const document = { hidden: true, addEventListener: (_, fn) => { visible = fn; } };
const context = {
  document, Date: { now: () => time }, localStorage: { getItem: k => storage[k] || null, setItem: (k, v) => { storage[k] = v; } },
  Worker: function () { Object.defineProperty(this, 'onmessage', { set: fn => { callback = fn; } }); },
  tizen: { application: { launch: id => { assert.equal(id, 'XanderView.XanderView'); calls++; } } },
  webapis: { appcommon: { getForegroundAppId: () => foreground } }, location: { protocol: 'http:' }
};
context.window = context;
vm.runInNewContext(fs.readFileSync('app/return-home.js', 'utf8'), context);
callback(); time += 801; callback(); assert.equal(calls, 0, 'return is off by default');
context.XanderViewReturnHome.setEnabled(true);
callback(); time += 801; callback(); assert.equal(calls, 1, 'Samsung Home causes one return');
callback(); time += 1000; callback(); assert.equal(calls, 1, 'return is rate limited');
foreground = 'org.tizen.netflix-app'; time += 5000; callback(); time += 1000; callback(); assert.equal(calls, 1, 'streaming apps remain foreground');
foreground = 'com.samsung.tv.csfs'; context.XanderViewReturnHome.pause(30000); time += 5000; callback(); assert.equal(calls, 1, 'intentional Samsung screens are paused');
document.hidden = false; visible(); callback(); document.hidden = true; callback(); time += 801; callback(); assert.equal(calls, 2, 'return resumes after launcher is visible again');
context.XanderViewReturnHome.setEnabled(false); time += 10000; callback(); assert.equal(calls, 2, 'disabled option prevents return');
console.log('Return to XanderView state checks passed.');
