/* Optional weather, stored on this TV. Forecast: Open-Meteo; places: GeoNames. */
(function () {
  'use strict';

  var CONFIG_KEY = 'cleanframe.weather.v1', CACHE_KEY = 'cleanframe.weather.cache.v1';
  var PERIOD = 15 * 60 * 1000, STALE_AFTER = 30 * 60 * 1000, CACHE_MAX = 24 * 60 * 60 * 1000;
  var TIMEOUT = 12000, listeners = [], active = false, timer = null, request = null, generation = 0;
  var failures = 0, searchGeneration = 0, searchRequest = null;
  var config = { enabled: false, location: null, units: 'fahrenheit', showForecast: true };
  var status = 'idle', data = null, updatedAt = null, error = null, forcedStale = false;
  var attribution = { label: 'Weather by Open-Meteo', url: 'https://open-meteo.com/', places: 'Location data by GeoNames' };

  function copy(value) { return value === null ? null : JSON.parse(JSON.stringify(value)); }
  function number(value) { return typeof value === 'number' && isFinite(value); }
  function clean(value, maximum) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maximum) : ''; }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function location(value) {
    var result;
    if (value === null) return null;
    if (!value || typeof value !== 'object' || !number(value.latitude) || !number(value.longitude) ||
        value.latitude < -90 || value.latitude > 90 || value.longitude < -180 || value.longitude > 180)
      throw new Error('Choose a valid weather location.');
    result = { name: clean(value.name, 100), label: clean(value.label || value.name, 180), latitude: value.latitude, longitude: value.longitude };
    if (!result.name || !result.label) throw new Error('The weather location needs a name.');
    if (value.timezone !== undefined && value.timezone !== null) {
      if (typeof value.timezone !== 'string' || !/^[A-Za-z0-9_+\/-]{1,100}$/.test(value.timezone)) throw new Error('The location time zone is invalid.');
      result.timezone = value.timezone;
    }
    return result;
  }
  function normalized(value) {
    if (!value || typeof value !== 'object' || typeof value.enabled !== 'boolean' || typeof value.showForecast !== 'boolean' ||
        ['fahrenheit', 'celsius'].indexOf(value.units) < 0) throw new Error('Weather settings are invalid.');
    return { enabled: value.enabled, location: location(value.location), units: value.units, showForecast: value.showForecast };
  }
  function key(value) {
    return value.location ? value.location.latitude.toFixed(6) + ',' + value.location.longitude.toFixed(6) + ':' + value.units : '';
  }
  function stale() { return !!data && (forcedStale || Date.now() - updatedAt > STALE_AFTER || Date.now() < updatedAt - 300000); }
  function expireData() {
    if (data && (Date.now() - updatedAt > CACHE_MAX || Date.now() < updatedAt - 300000)) {
      data = null; updatedAt = null; forcedStale = false;
      if (status === 'ready') status = 'idle';
    }
  }
  function snapshot() {
    expireData();
    return { status: status, config: copy(config), data: copy(data), updatedAt: updatedAt, error: error, stale: stale() };
  }
  function emit() {
    var value = snapshot();
    listeners.slice().forEach(function (listener) { try { listener(copy(value)); } catch (ignore) {} });
  }
  function condition(code, isDay) {
    if (code === 0) return { condition: isDay === false ? 'Clear night' : 'Clear sky', icon: isDay === false ? 'moon' : 'sun' };
    if (code === 1) return { condition: 'Mainly clear', icon: isDay === false ? 'moon' : 'sun' };
    if (code === 2) return { condition: 'Partly cloudy', icon: 'partly-cloudy' };
    if (code === 3) return { condition: 'Overcast', icon: 'cloud' };
    if (code === 45 || code === 48) return { condition: code === 48 ? 'Freezing fog' : 'Fog', icon: 'fog' };
    if ([51, 53, 55].indexOf(code) >= 0) return { condition: 'Drizzle', icon: 'rain' };
    if ([56, 57].indexOf(code) >= 0) return { condition: 'Freezing drizzle', icon: 'rain' };
    if ([61, 63, 65].indexOf(code) >= 0) return { condition: code === 65 ? 'Heavy rain' : code === 61 ? 'Light rain' : 'Rain', icon: 'rain' };
    if ([66, 67].indexOf(code) >= 0) return { condition: 'Freezing rain', icon: 'rain' };
    if ([71, 73, 75, 77].indexOf(code) >= 0) return { condition: code === 75 ? 'Heavy snow' : code === 71 ? 'Light snow' : code === 77 ? 'Snow grains' : 'Snow', icon: 'snow' };
    if ([80, 81, 82].indexOf(code) >= 0) return { condition: code === 82 ? 'Heavy showers' : 'Rain showers', icon: 'rain' };
    if (code === 85 || code === 86) return { condition: 'Snow showers', icon: 'snow' };
    if ([95, 96, 99].indexOf(code) >= 0) return { condition: code === 95 ? 'Thunderstorm' : 'Thunderstorm with hail', icon: 'storm' };
    return { condition: 'Conditions unavailable', icon: 'cloud' };
  }
  function parseWeather(value, selected) {
    var current = value && value.current, daily = value && value.daily, result, description, i;
    if (!current || !daily || value.error || !number(current.temperature_2m) || !number(current.apparent_temperature) ||
        !number(current.relative_humidity_2m) || !number(current.wind_speed_10m) || !number(current.weather_code) ||
        [0, 1].indexOf(current.is_day) < 0 || typeof current.time !== 'string' ||
        !Array.isArray(daily.time) || daily.time.length < 4 || !Array.isArray(daily.temperature_2m_min) ||
        !Array.isArray(daily.temperature_2m_max) || !Array.isArray(daily.weather_code)) throw new Error('Weather data is incomplete.');
    description = condition(current.weather_code, current.is_day === 1);
    result = {
      location: copy(selected.location), units: selected.units, timezone: clean(value.timezone, 100) || selected.location.timezone || '',
      temperatureUnit: selected.units === 'fahrenheit' ? '\u00b0F' : '\u00b0C', windUnit: selected.units === 'fahrenheit' ? 'mph' : 'km/h',
      current: { temperature: current.temperature_2m, apparentTemperature: current.apparent_temperature, humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m, weatherCode: current.weather_code, isDay: current.is_day === 1, time: current.time,
        condition: description.condition, icon: description.icon }, daily: [], attribution: copy(attribution)
    };
    for (i = 0; i < Math.min(daily.time.length, 5); i++) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(daily.time[i]) || !number(daily.temperature_2m_min[i]) ||
          !number(daily.temperature_2m_max[i]) || !number(daily.weather_code[i])) throw new Error('Forecast data is incomplete.');
      description = condition(daily.weather_code[i], true);
      result.daily.push({ date: daily.time[i], minimum: daily.temperature_2m_min[i], maximum: daily.temperature_2m_max[i],
        weatherCode: daily.weather_code[i], condition: description.condition, icon: description.icon });
    }
    return result;
  }
  function clearTimer() { if (timer !== null) { clearTimeout(timer); timer = null; } }
  function cancelRequest() {
    generation++;
    if (request) { request.cancel(); request = null; }
  }
  function canFetch() { return active && config.enabled && !!config.location; }
  function schedule(delay) {
    clearTimer();
    if (canFetch()) timer = setTimeout(function () { timer = null; fetchWeather(); }, delay);
  }
  function readCache() {
    var cached, age;
    data = null; updatedAt = null; forcedStale = false;
    if (!config.location) return;
    try {
      cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
      age = cached && Date.now() - cached.updatedAt;
      if (!cached || cached.version !== 1 || cached.key !== key(config) || !number(cached.updatedAt) || age < -300000 || age > CACHE_MAX) return;
      data = parseWeather(cached.response, config); updatedAt = cached.updatedAt;
    } catch (ignore) { data = null; updatedAt = null; }
  }
  function requestJSON(url, callback) {
    var xhr, done = false, timeout;
    function finish(err, value) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      if (xhr) { xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null; }
      callback(err, value);
    }
    try {
      xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = TIMEOUT;
      xhr.onload = function () {
        var value;
        if (xhr.status !== 200) { finish({ type: 'http', message: 'Weather service is unavailable. Please try again.' }); return; }
        try {
          if (xhr.responseText.length > 524288) throw new Error('Response too large');
          value = JSON.parse(xhr.responseText);
          if (value && value.error) throw new Error('API error');
        } catch (ignore) { finish({ type: 'data', message: 'The weather service returned incomplete data.' }); return; }
        finish(null, value);
      };
      xhr.onerror = function () { finish({ type: 'network', message: 'Weather could not connect. Check the TV network.' }); };
      xhr.ontimeout = function () { finish({ type: 'network', message: 'The weather request timed out. Please try again.' }); };
      xhr.onabort = function () { finish({ type: 'cancelled', message: 'Weather request cancelled.' }); };
      timeout = setTimeout(function () { finish({ type: 'network', message: 'The weather request timed out. Please try again.' }); try { xhr.abort(); } catch (ignore) {} }, TIMEOUT + 1000);
      xhr.send();
    } catch (ignore) {
      /* Keep constructor/open/send failures asynchronous, like normal XHR events. */
      timeout = setTimeout(function () { finish({ type: 'network', message: 'Weather could not connect. Check the TV network.' }); }, 0);
    }
    return { cancel: function () { if (done) return; done = true; clearTimeout(timeout); if (xhr) { xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null; try { xhr.abort(); } catch (ignore) {} } } };
  }
  function fetchWeather() {
    var selected, token, url;
    clearTimer();
    if (!canFetch() || request) return;
    expireData();
    selected = copy(config); token = generation;
    url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(selected.location.latitude) +
      '&longitude=' + encodeURIComponent(selected.location.longitude) +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto' +
      '&temperature_unit=' + selected.units + '&wind_speed_unit=' + (selected.units === 'fahrenheit' ? 'mph' : 'kmh');
    status = 'loading'; error = null; emit();
    request = requestJSON(url, function (err, value) {
      var next;
      if (token !== generation || !canFetch() || key(selected) !== key(config)) return;
      request = null;
      if (!err) {
        try { next = parseWeather(value, selected); }
        catch (ignore) { err = { type: 'data', message: 'The weather service returned incomplete data.' }; }
      }
      if (err) {
        failures++; status = err.type === 'network' || err.type === 'http' ? 'offline' : 'error';
        error = err.message; forcedStale = !!data; emit();
        schedule(failures < 3 ? failures * 60000 : PERIOD);
        return;
      }
      data = next; updatedAt = Date.now(); forcedStale = false; status = 'ready'; error = null; failures = 0;
      try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, key: key(config), updatedAt: updatedAt, response: value })); }
      catch (ignore) { /* Live weather remains usable when its optional offline cache cannot be written. */ }
      emit(); schedule(PERIOD);
    });
  }
  function configure(patch) {
    var next = copy(config), changed, changedPlace;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Weather settings are invalid.');
    Object.keys(patch).forEach(function (field) {
      if (['enabled', 'location', 'units', 'showForecast'].indexOf(field) < 0) throw new Error('Unknown weather setting.');
      next[field] = patch[field];
    });
    next = normalized(next); changed = JSON.stringify(next) !== JSON.stringify(config);
    if (!changed) return copy(config);
    try { window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next)); }
    catch (ignore) {
      error = 'Weather settings could not be saved. Please try again.'; emit(); throw new Error(error);
    }
    changedPlace = key(next) !== key(config);
    clearTimer(); cancelRequest(); config = next; failures = 0; error = null;
    if (changedPlace) readCache();
    if (data) data.location = copy(config.location);
    status = config.enabled && data ? 'ready' : 'idle';
    if (canFetch()) {
      if (changedPlace || !data || stale()) fetchWeather();
      else schedule(Math.max(1000, PERIOD - (Date.now() - updatedAt)));
    }
    emit();
    return copy(config);
  }
  function start() {
    active = true;
    if (!canFetch()) return;
    if (data && Date.now() - updatedAt < PERIOD && !forcedStale) schedule(Math.max(1000, PERIOD - (Date.now() - updatedAt)));
    else fetchWeather();
  }
  function pause() {
    active = false; clearTimer(); cancelRequest();
    if (status === 'loading') { status = data ? 'ready' : 'idle'; emit(); }
  }
  function refresh() { failures = 0; if (canFetch()) { cancelRequest(); fetchWeather(); } return snapshot(); }
  function search(query, callback) {
    var text = clean(query, 100), token, operation, done = false;
    if (typeof callback !== 'function') throw new Error('A location search callback is required.');
    searchGeneration++; token = searchGeneration;
    if (searchRequest) { searchRequest.cancel(); searchRequest = null; }
    if (text.length < 2) { callback('Enter a city or postal code.', []); return function () {}; }
    operation = requestJSON('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(text) +
      '&count=6&language=en&format=json' + (/^\d{5}$/.test(text) ? '&countryCode=US' : ''), function (err, value) {
      var places = [], seen = {};
      if (done || token !== searchGeneration) return;
      done = true; searchRequest = null;
      if (err) { callback(err.message, []); return; }
      if (value && value.results !== undefined && !Array.isArray(value.results)) { callback('Location search returned incomplete data.', []); return; }
      (value.results || []).slice(0, 6).forEach(function (place) {
        var found, label, id;
        try {
          label = [place.name, place.admin1, place.country].filter(function (part, index, parts) { return part && parts.indexOf(part) === index; }).join(', ');
          found = location({ name: place.name, label: label, latitude: place.latitude, longitude: place.longitude, timezone: place.timezone });
          id = found.latitude.toFixed(6) + ',' + found.longitude.toFixed(6);
          if (!seen[id]) { seen[id] = true; places.push(found); }
        } catch (ignore) {}
      });
      callback(null, places);
    });
    searchRequest = operation;
    return function () { if (done || token !== searchGeneration) return; done = true; searchGeneration++; operation.cancel(); searchRequest = null; };
  }

  try {
    var saved = window.localStorage.getItem(CONFIG_KEY);
    if (saved !== null) config = normalized(JSON.parse(saved));
  } catch (ignore) { error = 'Saved weather settings could not be read. Choose a location in Settings.'; }
  readCache();
  if (config.enabled && data) status = 'ready';
  window.XanderViewWeather = {
    configure: configure, getConfig: function () { return copy(config); }, state: snapshot,
    subscribe: function (listener) {
      if (typeof listener !== 'function') throw new Error('A weather listener is required.');
      listeners.push(listener); try { listener(snapshot()); } catch (ignore) {}
      return function () { var index = listeners.indexOf(listener); if (index >= 0) listeners.splice(index, 1); };
    },
    start: start, pause: pause, refresh: refresh, search: search, describe: condition, attribution: copy(attribution)
  };
})();
