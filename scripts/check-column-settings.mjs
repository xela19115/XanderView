import assert from 'node:assert/strict';
import {openPreview} from './browser.mjs';
const preview=await openPreview({publicFonts:true});
try {
 for (const width of [1920,1280]) {
  const page=await preview.browser.newPage({viewport:{width,height:width*9/16}});
  await page.addInitScript(()=>{if(localStorage.getItem('cleanframe.home.v1')) return; let home=['netflix','youtube','plex','primevideo','disneyplus','appletv','kartinatv','tvplus'];for(let i=0;i<10;i++) home.push('Example00'+i+'.App');localStorage.setItem('cleanframe.home.v1',JSON.stringify({home,layout:'dock',apps:'icons',lastApp:'netflix'}));});
  await page.goto(preview.baseURL+'/home/');await page.waitForFunction(()=>ShoreQA.ready());
  let sizes=[];
  for (const cols of [3,4,5]) {
   await page.evaluate(()=>{ShoreQA.scene('settings');ShoreQA.activate('settings.group.layout')});
   const controls=await page.evaluate(()=>[...document.querySelectorAll('[data-action^="choice.columns."]')].map(e=>({action:e.dataset.action,box:e.getBoundingClientRect().toJSON()})));
   assert.equal(controls.length,3);
   assert(controls.every(x=>x.box.bottom<=width*9/16),'Column choices are visible');
   await page.evaluate(n=>ShoreQA.activate('choice.columns.'+n),cols);
   assert.equal(await page.evaluate(()=>ShoreQA.state().committed.columns),String(cols));
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cleanframe.home.v1')).columns),String(cols));
   await page.evaluate(()=>ShoreQA.scene('home'));
   await page.waitForTimeout(450);
   const tiles=await page.evaluate(()=>[...document.querySelectorAll('#track .tile')].map(t=>t.getBoundingClientRect().toJSON()));
   assert(tiles[cols-1].top===tiles[0].top && tiles[cols].top>tiles[0].top,`${cols} per row`);
   assert(tiles.slice(0,cols).every(t=>t.left>=0 && t.right<=width && t.bottom<=width*9/16));
   sizes.push(tiles[0].width);
  }
  assert(sizes[0]>sizes[1] && sizes[1]>sizes[2], 'Tiles scale down as columns increase');
  await page.reload();await page.waitForFunction(()=>ShoreQA.ready());
  assert.equal(await page.evaluate(()=>ShoreQA.state().committed.columns),'5','Setting persists across restart');
  await page.close();
 }
 console.log('Three, four and five columns, scaling and persistence passed at both TV sizes.');
} finally {await preview.close()}
