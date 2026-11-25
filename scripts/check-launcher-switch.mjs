import assert from 'node:assert/strict';
import {openPreview} from './browser.mjs';
const preview=await openPreview({publicFonts:true});
try {
 const page=await preview.browser.newPage({viewport:{width:1920,height:1080}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()===404 && r.url().includes('/home/') && !r.url().includes('/assets/icons/projectivy/')) errors.push('Missing '+r.url());});
 await page.addInitScript(()=>{if(!localStorage.getItem('cleanframe.home.v1')) localStorage.setItem('cleanframe.home.v1',JSON.stringify({home:['youtube','plex','netflix','primevideo','appletv','disneyplus','tvplus','kartinatv'],layout:'dock',columns:'5',apps:'both',lastApp:'youtube'}));});
 await page.goto(preview.baseURL+'/home/');await page.waitForFunction(()=>window.ShoreQA&&ShoreQA.ready());
 const before=await page.evaluate(()=>({home:ShoreQA.state().committed.home,wall:ShoreQA.state().committed.wall,columns:ShoreQA.state().committed.columns}));
 await page.evaluate(()=>{ShoreQA.scene('settings');ShoreQA.activate('settings.group.layout')});
 assert.equal(await page.locator('[data-action="choice.launcher.cleanframe"]').getAttribute('aria-checked'),'true');
 await page.evaluate(()=>ShoreQA.activate('choice.launcher.xanderview'));
 await page.waitForURL('**/xanderview/index.html');await page.waitForFunction(()=>window.ShoreQA&&ShoreQA.ready());
 assert.equal(await page.title(),'Dock');
 const alternate=await page.evaluate(()=>({home:ShoreQA.state().committed.home,wall:ShoreQA.state().committed.wall,columns:ShoreQA.state().committed.columns,controls:[...document.querySelectorAll('#utils .u')].map(x=>x.dataset.action)}));
 assert.deepEqual(alternate.home,before.home);assert.equal(alternate.wall,before.wall);assert.equal(alternate.columns,'5');assert(!alternate.controls.includes('util.home'));
 await page.goto(preview.baseURL+'/home/');await page.waitForURL('**/xanderview/index.html');await page.waitForFunction(()=>window.ShoreQA&&ShoreQA.ready());
 await page.evaluate(()=>{ShoreQA.scene('settings');ShoreQA.activate('settings.group.layout')});
 assert.equal(await page.locator('[data-action="choice.launcher.xanderview"]').getAttribute('aria-checked'),'true');
 await page.evaluate(()=>ShoreQA.activate('choice.launcher.cleanframe'));
 await page.waitForURL('**/home/index.html');await page.waitForFunction(()=>window.ShoreQA&&ShoreQA.ready());
 const after=await page.evaluate(()=>({home:ShoreQA.state().committed.home,wall:ShoreQA.state().committed.wall,columns:ShoreQA.state().committed.columns,controls:[...document.querySelectorAll('#utils .u')].map(x=>x.dataset.action)}));
 assert.deepEqual(after.home,before.home);assert.equal(after.wall,before.wall);assert.equal(after.columns,'5');assert(after.controls.includes('util.home'));
 assert.deepEqual(errors,[]);
 console.log('Both Home screens switch in either direction, retain settings and restore on restart.');
 await page.close();
} finally {await preview.close()}
