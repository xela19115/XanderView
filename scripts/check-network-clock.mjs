import assert from 'node:assert/strict';
import {openPreview} from './browser.mjs';
const p=await openPreview();
try {
 for(const view of ['cleanframe','xanderview']) {
  const page=await p.browser.newPage();
  await page.route('https://timeapi.io/**',async route=>{let d=new Date();await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),seconds:d.getUTCSeconds(),milliSeconds:d.getUTCMilliseconds(),timeZone:'UTC'})})});
  await page.addInitScript(v=>{const original=Date.now;Date.now=()=>original()+275000;localStorage.setItem('cleanframe.launcher.style',v)},view);
  const before=Date.now();await page.goto(p.baseURL+'/home/');await page.waitForFunction(()=>window.FrameClock && Math.abs(FrameClock.now()-Date.now())>200000);const result=await page.evaluate(()=>({time:FrameClock.now(),display:document.querySelector('.home-clock-row .clock').textContent,period:document.querySelector('.clock-period').textContent}));
  assert(Math.abs(result.time-Date.now())<3000,JSON.stringify(result));let d=new Date(result.time);assert.equal(result.display,(d.getHours()%12||12)+':'+String(d.getMinutes()).padStart(2,'0'));assert.equal(result.period,d.getHours()<12?'AM':'PM');console.log(view,'corrects 275 second skew and displays corrected time');await page.close();
 }
} finally {await p.close()}
