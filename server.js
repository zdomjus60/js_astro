const express = require('express');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const app = express();
app.use(express.json());

// Simple per-IP rate limiting (good web citizenship + accidental-abuse guard).
// Fixed window per hour, keyed by client IP. Mirrors the Cloudflare Worker.
// Override with RATE_LIMIT_PER_HOUR (e.g. RATE_LIMIT_PER_HOUR=5 for tests).
const RATE_WINDOW_MS = 3600000;
const RATE_MAX_BUCKETS = 20000;
const RATE_LIMIT_PER_HOUR = parseInt(process.env.RATE_LIMIT_PER_HOUR || '100', 10);
const rateHits = new Map();
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const ip = req.headers['cf-connecting-ip'] || req.ip ||
               req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const slot = Math.floor(now / RATE_WINDOW_MS);
    const rec = rateHits.get(ip);
    if (!rec || rec.slot !== slot) {
        if (rateHits.size >= RATE_MAX_BUCKETS) rateHits.clear();
        rateHits.set(ip, { slot, count: 1 });
        return next();
    }
    rec.count++;
    if (rec.count > RATE_LIMIT_PER_HOUR) {
        return res.status(429).set('Retry-After', '3600').json({
            error: 'Rate limit exceeded. Please slow down and retry in a while.',
            perIpLimitPerHour: RATE_LIMIT_PER_HOUR,
            retryAfterSeconds: 3600
        });
    }
    return next();
});
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
// Home page with API documentation
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>js_astro API</title>
    <style>
        body { font-family: monospace; margin: 30px; background: #1a1a2e; color: #e0e0e0; }
        h1 { color: #00d4ff; }
        a { color: #ffd700; }
        code { background: #16213e; padding: 2px 6px; border-radius: 3px; }
        .endpoint { margin: 15px 0; }
    </style>
</head>
<body>
    <h1>js_astro API</h1>
    <p>Astrological calculation library - Japanese original by Yoshihiro Sakai<br>
    Fork with English translation and local time support.</p>

    <h2>Calculator interface</h2>
    <p><a href="/app" style="display:inline-block;margin:6px 0;padding:14px 24px;background:#00d4ff;color:#0b1420;font-weight:bold;font-size:17px;text-decoration:none;border-radius:8px">&#128640; Open the online calculator</a><br>
    <em style="color:#9aa4b8;font-size:13px">Pick a date and time, search your city - chart and Ultracopernican 364 zodiac explained in readable text.</em></p>

    <h2>Endpoints</h2>

    <div class="endpoint">
        <strong>GET /api/planets</strong> - Planetary positions<br>
        <a href="/api/planets?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome">Test with a real chart (local time + tz)</a>
    </div>

    <div class="endpoint">
        <strong>GET /api/houses</strong> - House cusps (add <code>system=1-7</code>)<br>
        <a href="/api/houses?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome&system=1">Test Placidus (local time + tz)</a>
    </div>

    <div class="endpoint">
        <strong>GET /api/chart</strong> - Full chart (planets + points + houses)<br>
        <a href="/api/chart?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome">Test full chart (local time + tz)</a>
    </div>

    <div class="endpoint">
        <strong>GET /api/zodiac</strong> - 364-part zodiac + zodiac time (Ultracopernican)<br>
        <a href="/api/zodiac?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome">Test ultracopernican chart (local time + tz)</a>
    </div>

    <div class="endpoint">
        <strong>GET /api/places</strong> - search a place by name (same name in several countries &rarr; pick the right one)<br>
        <a href="/api/places?q=roma">search roma</a> &nbsp; <a href="/api/places?q=san%20jose">search san jose</a>
    </div>

    <h2>Parameters</h2>
    <code>year</code>, <code>month</code>, <code>day</code>, <code>hour</code>, <code>minute</code> (local civil time of the birthplace).<br>
    Location: <code>lon</code> + <code>lat</code> as decimal degrees (<code>45.19</code>) or degrees-minutes-seconds
    (<code>45&deg;15'30"N</code>) &mdash; <strong>or</strong> <code>city</code>=name with optional <code>country</code>=ISO 3166 code;
    the API resolves coordinates and time zone automatically.<br>
    Optional: <code>system</code> (1=Placidus, 2=Campanus, 3=Regiomontanus, 4=Koch, 5=Topocentric, 6=Axial, 7=Morinus)<br>
    Optional: <code>tz</code> - IANA (OLSON) time zone name (e.g. <code>Europe/Rome</code>, <code>Asia/Tokyo</code>).<br>
    The time entered is the <strong>local civil time of the birthplace</strong>; with <code>tz</code> the API converts it to UTC automatically (historical DST included). Without <code>tz</code>, the entered time is treated as UTC.<br>
    See the <a href="https://www.iana.org/time-zones">IANA Time Zone Database</a> for zone names.

    <h2>Place search</h2>
    <code>GET /api/places?q=roma&amp;country=IT&amp;limit=10</code> - returns candidate matches with
    coordinates, IANA time zone and population, so you can disambiguate homonyms across countries.

    <h2>House systems</h2>
    <table>
        <tr><td><code>system=1</code></td><td>Placidus</td></tr>
        <tr><td><code>system=2</code></td><td>Campanus</td></tr>
        <tr><td><code>system=3</code></td><td>Regiomontanus</td></tr>
        <tr><td><code>system=4</code></td><td>Koch</td></tr>
        <tr><td><code>system=5</code></td><td>Topocentric</td></tr>
        <tr><td><code>system=6</code></td><td>Axial</td></tr>
        <tr><td><code>system=7</code></td><td>Morinus</td></tr>
    </table>
</body>
</html>`);
});
app.use(express.static('public'));

// GET /api/places?q=name&country=CC&limit=N - search a place (disambiguate homonyms)
app.get('/api/places', (req, res) => {
    const q = String(req.query.q || '').trim();
    const cc = req.query.country || null;
    const lim = parseInt(req.query.limit || '10', 10);
    if (!q) return res.status(400).json({ error: 'Missing parameter: q', hint: '/api/places?q=roma&country=IT' });
    const results = searchPlaces(q, cc, isNaN(lim) ? 10 : lim);
    res.json({ query: q, country: cc || '', count: results.length, results });
});

// Load astro library
const files = [
    'src/math.js',
    'src/astronomy.js',
    'src/geodata.js',
    'src/pluto.js',
    'src/hekichan.js',
    'src/metako.js',
    'src/cuspcal.js',
    'src/zodiac.js',
    'src/tz.js',
    'src/coord.js',
    'src/places.js'
];

const sandbox = { Math, console, Array, Number, String, parseInt, parseFloat, isNaN, Date, Intl };
vm.createContext(sandbox);
for (const f of files) {
    vm.runInContext(fs.readFileSync(f, 'utf-8'), sandbox, { filename: f });
}

const { calPlanetPosition2, calHouseCusp2, describeZodiac364, jdToZodiacTime,
        isValidIANAZone, localCivilToUtc, parseCoord, findPlace, searchPlaces } = sandbox;

// Helper: convert longitude to zodiac
function toZodiac(lon) {
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                   'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const abbr = ['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Ca','Aq','Pi'];
    const l = ((lon % 360) + 360) % 360;
    const sign = Math.floor(l / 30);
    const deg = l % 30;
    const d = Math.floor(deg);
    const m = Math.floor((deg - d) * 60);
    const s = Math.floor(((deg - d) * 60 - m) * 60);
    return {
        longitude: parseFloat(lon.toFixed(4)),
        sign: signs[sign],
        abbr: abbr[sign],
        degree: d,
        minute: m,
        second: s,
        formatted: `${signs[sign]} ${d}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`
    };
}

// Resolve and validate query params; converts local civil time to UTC when tz is given
function resolveParams(q) {
    const { year, month, day, hour, minute, lon, lat, tz, system, city, country } = q;
    if (!year || !month || !day || !hour || !minute) {
        return { error: { error: 'Missing parameters', required: ['year','month','day','hour','minute'] } };
    }
    const pad2 = (v) => String(v).padStart(2, '0');
    let y = parseInt(year), m = parseInt(month), d = parseInt(day);
    let h = parseInt(hour), mi = parseInt(minute);
    const htype = parseInt(system) || 1;

    // Location: lon+lat (decimal degrees or degrees-minutes-seconds) or
    // city=<name> with optional country=<ISO-3166 alpha-2>.
    const hasLon = typeof lon === 'string' && lon.trim() !== '';
    const hasLat = typeof lat === 'string' && lat.trim() !== '';
    const hasCity = typeof city === 'string' && city.trim() !== '';
    let lo = NaN, la = NaN;
    let effTz = (typeof tz === 'string' && tz !== '') ? tz : null;

    const base = { date: `${y}-${pad2(m)}-${pad2(d)}`,
                   time: `${pad2(h)}:${pad2(mi)}` };

    if (hasLon || hasLat) {
        if (hasLon !== hasLat) {
            return { error: { error: 'Provide both lon and lat together' } };
        }
        lo = parseCoord(lon);
        la = parseCoord(lat);
        if (isNaN(lo) || isNaN(la)) {
            return { error: { error: 'Invalid lon/lat. Use decimal degrees (e.g. 45.19) or degrees-minutes-seconds (e.g. 45°15\'30"N)' } };
        }
    } else if (hasCity) {
        const pl = findPlace(city.trim(), country);
        if (!pl) {
            return { error: { error: 'Unknown place: ' + city + (country ? ' (' + country + ')' : ''),
                              hint: 'Use /api/places?q=... to search the exact location and its country code' } };
        }
        lo = pl[4]; la = pl[3];
        base.resolved = { name: pl[0], country: pl[2], population: pl[6] };
        if (!effTz) effTz = pl[5];
    } else {
        return { error: { error: 'Missing location', required: ['lon','lat'] + ' or ' + ['city'], hint: 'lon/lat accept decimal degrees or degrees-minutes-seconds' } };
    }
    base.location = { longitude: lo, latitude: la };

    if (effTz) {
        if (!isValidIANAZone(effTz)) {
            return { error: { error: 'Unknown IANA time zone: ' + effTz,
                              hint: 'Zone names come from the IANA (OLSON) database: https://www.iana.org/time-zones' } };
        }
        const conv = localCivilToUtc(y, m, d, h, mi, effTz);
        base.timeZone = effTz;
        base.localDate = base.date;
        base.localTime = base.time;
        base.utcDate = `${conv.year}-${pad2(conv.month)}-${pad2(conv.day)}`;
        base.utcTime = `${pad2(conv.hour)}:${pad2(conv.minute)}`;
        base.utcOffsetMinutes = conv.offsetMinutes;
        y = conv.year; m = conv.month; d = conv.day;
        h = conv.hour; mi = conv.minute;
    } else {
        base.utcDate = base.date;
        base.utcTime = base.time;
    }
    return { y, m, d, h, mi, lo, la, htype, base };
}

// GET /api/planets?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19
app.get('/api/planets', (req, res) => {
    const r = resolveParams(req.query);
    if (r.error) return res.status(400).json(r.error);
    const { y, m, d, h, mi, lo, la, base } = r;

    const p = calPlanetPosition2(y, m, d, h, mi, lo, la);

    res.json(Object.assign(base, {
        julianDay: parseFloat(p[0].toFixed(6)),
        planets: {
            sun:     toZodiac(p[1]),
            moon:    toZodiac(p[2]),
            mercury: toZodiac(p[3]),
            venus:   toZodiac(p[4]),
            mars:    toZodiac(p[5]),
            jupiter: toZodiac(p[6]),
            saturn:  toZodiac(p[7]),
            uranus:  toZodiac(p[8]),
            neptune: toZodiac(p[9]),
            pluto:   toZodiac(p[10])
        },
        points: {
            node:   toZodiac(p[11]),
            apogee: toZodiac(p[12]),
            asc:    toZodiac(p[13]),
            mc:     toZodiac(p[14])
        },
        minorPlanets: {
            ceres:  toZodiac(p[15]),
            pallas: toZodiac(p[16]),
            juno:   toZodiac(p[17]),
            vesta:  toZodiac(p[18]),
            chiron: toZodiac(p[19])
        }
    }));
});

// GET /api/zodiac - 364-part zodiac (revolution ultracopernicana)
app.get('/api/zodiac', (req, res) => {
    const r = resolveParams(req.query);
    if (r.error) return res.status(400).json(r.error);
    const { y, m, d, h, mi, lo, la, base } = r;

    const p = calPlanetPosition2(y, m, d, h, mi, lo, la);
    const t = jdToZodiacTime(p[0]);

    const planets = {};
    const names = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
    for (let i = 0; i < 10; i++) planets[names[i]] = describeZodiac364(p[i + 1]);

    const points = {
        node:   describeZodiac364(p[11]),
        apogee: describeZodiac364(p[12]),
        asc:    describeZodiac364(p[13]),
        mc:     describeZodiac364(p[14])
    };

    const minorPlanets = {
        ceres:  describeZodiac364(p[15]),
        pallas: describeZodiac364(p[16]),
        juno:   describeZodiac364(p[17]),
        vesta:  describeZodiac364(p[18]),
        chiron: describeZodiac364(p[19])
    };

    res.json(Object.assign(base, {
        julianDay: parseFloat(p[0].toFixed(6)),
        description: 'Credible alternative to the 12-sign zodiac: 364 parts = 13 signs x 28, origin = real winter solstice',
        planets,
        points,
        minorPlanets,
        zodiacTime: t
    }));
});

// GET /api/houses?year=...&month=...&day=...&hour=...&minute=...&lon=...&lat=...&system=1
app.get('/api/houses', (req, res) => {
    const r = resolveParams(req.query);
    if (r.error) return res.status(400).json(r.error);
    const { y, m, d, h, mi, lo, la, htype, base } = r;

    const c = calHouseCusp2(y, m, d, h, mi, lo, la, htype);

    const systemNames = {
        1: 'Placidus', 2: 'Campanus', 3: 'Regiomontanus',
        4: 'Koch', 5: 'Topocentric', 6: 'Axial', 7: 'Morinus'
    };

    const houses = {};
    for (let i = 1; i <= 12; i++) {
        houses[`house${i}`] = toZodiac(c[i]);
    }

    res.json(Object.assign(base, {
        system: { id: htype, name: systemNames[htype] || 'Unknown' },
        houses
    }));
});

// GET /api/chart - everything in one call
app.get('/api/chart', (req, res) => {
    const r = resolveParams(req.query);
    if (r.error) return res.status(400).json(r.error);
    const { y, m, d, h, mi, lo, la, htype, base } = r;

    const p = calPlanetPosition2(y, m, d, h, mi, lo, la);
    const c = calHouseCusp2(y, m, d, h, mi, lo, la, htype);

    const systemNames = {
        1: 'Placidus', 2: 'Campanus', 3: 'Regiomontanus',
        4: 'Koch', 5: 'Topocentric', 6: 'Axial', 7: 'Morinus'
    };

    const houses = {};
    for (let i = 1; i <= 12; i++) {
        houses[`house${i}`] = toZodiac(c[i]);
    }

    res.json(Object.assign(base, {
        julianDay: parseFloat(p[0].toFixed(6)),
        planets: {
            sun:     toZodiac(p[1]),
            moon:    toZodiac(p[2]),
            mercury: toZodiac(p[3]),
            venus:   toZodiac(p[4]),
            mars:    toZodiac(p[5]),
            jupiter: toZodiac(p[6]),
            saturn:  toZodiac(p[7]),
            uranus:  toZodiac(p[8]),
            neptune: toZodiac(p[9]),
            pluto:   toZodiac(p[10])
        },
        points: {
            node:   toZodiac(p[11]),
            apogee: toZodiac(p[12]),
            asc:    toZodiac(p[13]),
            mc:     toZodiac(p[14])
        },
        minorPlanets: {
            ceres:  toZodiac(p[15]),
            pallas: toZodiac(p[16]),
            juno:   toZodiac(p[17]),
            vesta:  toZodiac(p[18]),
            chiron: toZodiac(p[19])
        },
        houseSystem: { id: htype, name: systemNames[htype] || 'Unknown' },
        houses
    }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`js_astro API running on http://localhost:${PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log('  GET /api/planets  - Planetary positions');
    console.log('  GET /api/houses   - House cusps');
    console.log('  GET /api/chart    - Full chart (planets + houses)');
    console.log('  GET /api/zodiac   - 364-part zodiac + zodiac time');
    console.log('  GET /api/places   - search a place by name (homonym disambiguation)');
    console.log('');
    console.log('Parameters: year, month, day, hour, minute');
    console.log('Location: lon+lat (decimal degrees or DMS) OR city=<name> (+country=<ISO code>)');
    console.log('Optional: system (1-7) for house system');
    console.log('Optional: tz (IANA/OLSON zone, e.g. Europe/Rome) - converts local time to UTC');
    console.log('IANA Time Zone Database: https://www.iana.org/time-zones');
});
