import assert from 'node:assert/strict';
import {openPreview} from './browser.mjs';
const p=await openPreview({publicFonts:true});
try {
 for (const width of [1920,1280]) {
  const page=await p.browser.newPage({viewport:{width,height:width*9/16}});
  await page.addInitScript(()=>{localStorage.setItem('cleanframe.launcher.style','xanderview');let home=['youtube','plex','netflix','primevideo','appletv','disneyplus','tvplus','kartinatv'];for(let i=0;i<10;i++)home.push('Example00'+i+'.App');localStorage.setItem('cleanframe.home.v1',JSON.stringify({home,layout:'dock',columns:'5',apps:'both',lastApp:'youtube'}));});
  await page.goto(p.baseURL+'/home/');await page.waitForURL('**/xanderview/index.html');await page.waitForFunction(()=>window.ShoreQA&&ShoreQA.ready()&&document.querySelectorAll('#track .has-native-tile').length>=2);
  const result=await page.evaluate(()=>({tiles:[...document.querySelectorAll('#track .tile')].map(x=>x.getBoundingClientRect().toJSON()),icons:[...document.querySelectorAll('#track img[data-native-tile]')].map(x=>x.getAttribute('src')),shelf:document.querySelector('#shelf').getBoundingClientRect().toJSON(),labels:[...document.querySelectorAll('#track .has-native-tile .label')].map(x=>({vis:getComputedStyle(x).visibility,rect:x.getBoundingClientRect().toJSON(),tile:x.closest('.tile').getBoundingClientRect().toJSON()}))}));
  assert.equal(result.tiles.length,18);assert(Math.abs(result.tiles[0].left-result.tiles[5].left)<1&&Math.abs(result.tiles[0].left-result.tiles[15].left)<1,'Full and partial rows align on the left');assert.equal(result.tiles[4].top,result.tiles[0].top);assert(result.tiles[5].top>result.tiles[0].top);assert(result.tiles[9].bottom<=result.shelf.bottom+1);assert(result.tiles[10].top>=result.shelf.bottom-1);
  assert(result.icons.some(s=>s.endsWith('/personal/kartina-tv-transparent.svg')));assert(result.icons.some(s=>s.endsWith('/personal/samsung-tv-plus-horizontal.svg')));
  assert(result.labels.every(l=>l.vis==='visible'&&l.rect.top>=l.tile.bottom+2),JSON.stringify(result.labels));
  await page.evaluate(()=>ShoreQA.nav('down','down','down'));await page.waitForTimeout(400);
  const focus=await page.evaluate(()=>({action:ShoreQA.where().focusAction,tile:document.querySelector('#track .tile.is-focus').getBoundingClientRect().toJSON(),shelf:document.querySelector('#shelf').getBoundingClientRect().toJSON()}));
  assert(focus.action,'Remote keeps focus');assert(focus.tile.top>=focus.shelf.top-1&&focus.tile.bottom<=focus.shelf.bottom+1,'Scrolling shows the selected app');
  await page.evaluate(()=>{ShoreQA.scene('settings');ShoreQA.activate('settings.group.layout')});
  assert.equal(await page.locator('[data-action="choice.launcher.cleanframe"]').innerText(),'Tiles');assert.equal(await page.locator('[data-action="choice.launcher.xanderview"]').innerText(),'Dock');
  await page.close();
 }
 console.log('Dock has two rows of five, public artwork, scrolling and renamed views at both sizes.');
} finally {await p.close()}
