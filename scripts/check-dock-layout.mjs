import assert from 'node:assert/strict';
import { openPreview } from './browser.mjs';

const preview = await openPreview({ publicFonts: true });
try {
  for (const width of [1920, 1280]) {
    const page = await preview.browser.newPage({ viewport: { width, height: width * 9 / 16 } });
    await page.addInitScript(() => {
      const home = ['netflix', 'youtube', 'plex', 'primevideo', 'disneyplus', 'appletv', 'kartinatv', 'tvplus'];
      for (let i = 0; i < 12; i++) home.push('Example00' + i + '.App');
      localStorage.setItem('cleanframe.home.v1', JSON.stringify({ home, layout: 'dock', apps: 'both', bg: 'photo', lastApp: 'netflix' }));
      localStorage.setItem('cleanframe.weather.v1', JSON.stringify({ enabled: true, location: { name: 'Philadelphia', label: 'Philadelphia', latitude: 39.9526, longitude: -75.1652 }, units: 'fahrenheit', showForecast: true }));
    });
    await page.goto(preview.baseURL + '/home/');
    await page.waitForFunction(() => window.ShoreQA && ShoreQA.ready());
    const layout = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('#track .tile')].map(e => e.getBoundingClientRect().toJSON());
      const weather = document.getElementById('weatherWidget').getBoundingClientRect();
      return {
        tiles, weatherBottom: weather.bottom,
        controls: [...document.querySelectorAll('#utils .u')].map(e => e.getAttribute('data-action')),
        marks: ['netflix', 'youtube'].map(id => getComputedStyle(document.querySelector('.brand-' + id + ' .mark')).color)
      };
    });
    assert.equal(layout.tiles.length, 20);
    assert(layout.tiles.every(r => Math.abs(r.width - r.height) < 1 && r.left >= 0 && r.right <= width && r.bottom <= width * 9 / 16));
    assert(Math.abs(layout.tiles[0].top - layout.tiles[9].top) < 1 && layout.tiles[10].top > layout.tiles[0].top, 'Ten tiles fit in each row');
    assert(layout.weatherBottom < layout.tiles[0].top);
    assert.deepEqual(layout.controls, ['util.apps', 'util.devices', 'util.tvsettings', 'util.settings']);
    assert.deepEqual(layout.marks, ['rgb(255, 255, 255)', 'rgb(255, 255, 255)']);
    await page.evaluate(() => ShoreQA.nav('up', 'right'));
    assert.equal(await page.evaluate(() => ShoreQA.where().focusAction), 'util.devices');
    await page.evaluate(() => ShoreQA.nav('right'));
    assert.equal(await page.evaluate(() => ShoreQA.where().focusAction), 'util.tvsettings');
    await page.evaluate(() => ShoreQA.nav('right'));
    const alignment = await page.evaluate(() => {
      const button = document.querySelector('[data-action="util.settings"]').getBoundingClientRect();
      const label = document.getElementById('utilFocusLabel').getBoundingClientRect();
      const tile = document.querySelector('#track .tile:not(.is-focus)');
      return { delta: Math.abs((button.left + button.right - label.left - label.right) / 2), border: getComputedStyle(tile, '::before').borderTopWidth };
    });
    assert(alignment.delta < 1, 'Settings label stays centered under its control');
    assert.equal(alignment.border, '1px', 'Unselected app tiles have a faint border');
    await page.evaluate(() => ShoreQA.nav('down'));
    assert.equal(await page.evaluate(() => ShoreQA.where().focusAction), 'home.app.netflix');
    await page.evaluate(() => ShoreQA.nav('down'));
    assert.equal(await page.evaluate(() => ShoreQA.where().focusAction), 'home.app.Example002.App');
    await page.evaluate(() => ShoreQA.nav('up'));
    assert.equal(await page.evaluate(() => ShoreQA.where().focusAction), 'home.app.netflix');
    await page.close();
  }
  for (const count of [1, 5, 9, 10, 11, 13, 19, 20]) {
    const page = await preview.browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript(count => {
      const home = Array.from({ length: count }, (_, i) => 'Example' + String(i).padStart(3, '0') + '.App');
      localStorage.setItem('cleanframe.home.v1', JSON.stringify({ home, layout: 'dock', apps: 'both', lastApp: home[0] }));
    }, count);
    await page.goto(preview.baseURL + '/home/');
    await page.waitForFunction(() => window.ShoreQA && ShoreQA.ready());
    const rows = await page.evaluate(() => [...document.querySelectorAll('#track .tile')].map(e => e.getBoundingClientRect().toJSON()));
    for (let i = 0; i < rows.length; i += 10) {
      const row = rows.slice(i, i + 10);
      assert(Math.abs((row[0].left + row[row.length - 1].right) / 2 - 960) < 1, `Row centered for ${count} apps`);
    }
    if (count > 10) {
      await page.evaluate(() => ShoreQA.nav('down'));
      await page.waitForTimeout(500);
      const focus = await page.evaluate(() => ({ tile: document.querySelector('#track .tile.is-focus').getBoundingClientRect().toJSON(), plate: document.querySelector('#plate').getBoundingClientRect().toJSON() }));
      assert(focus.tile.top > rows[0].top, 'Down reaches the second row');
      assert(Math.abs((focus.tile.left + focus.tile.right - focus.plate.left - focus.plate.right) / 2) < 2, 'Selection follows the centered tile');
    }
    await page.close();
  }
  console.log('Square dock, monochrome marks, weather spacing and remote controls passed at both sizes.');
} finally {
  await preview.close();
}
