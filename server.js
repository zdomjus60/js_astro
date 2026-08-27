const express = require('express');
const fs = require('fs');
const vm = require('vm');

const app = express();
app.use(express.json());
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

    <h2>Endpoints</h2>

    <div class="endpoint">
        <strong>GET /api/planets</strong> - Planetary positions<br>
        <a href="/api/planets?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19">Test with a real chart</a>
    </div>

    <div class="endpoint">
        <strong>GET /api/houses</strong> - House cusps (add <code>system=1-7</code>)<br>
        <a href="/api/houses?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19&system=1">Test Placidus</a>
    </div>

    <div class="endpoint">
        <strong>GET /api/chart</strong> - Full chart (planets + points + houses)<br>
        <a href="/api/chart?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19">Test full chart</a>
    </div>

    <div class="endpoint">
        <strong>GET /api/zodiac</strong> - 364-part zodiac + zodiac time (Ultracopernican)<br>
        <a href="/api/zodiac?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19">Test ultracopernican chart</a>
    </div>

    <h2>Parameters</h2>
    <code>year</code>, <code>month</code>, <code>day</code>, <code>hour</code>, <code>minute</code>, <code>lon</code>, <code>lat</code><br>
    Optional: <code>system</code> (1=Placidus, 2=Campanus, 3=Regiomontanus, 4=Koch, 5=Topocentric, 6=Axial, 7=Morinus)

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

// Load astro library
const files = [
    'src/math.js',
    'src/astronomy.js',
    'src/geodata.js',
    'src/pluto.js',
    'src/hekichan.js',
    'src/metako.js',
    'src/cuspcal.js',
    'src/zodiac.js'
];

const sandbox = { Math, console, Array, Number, String, parseInt, parseFloat, isNaN, Date };
vm.createContext(sandbox);
for (const f of files) {
    vm.runInContext(fs.readFileSync(f, 'utf-8'), sandbox, { filename: f });
}

const { calPlanetPosition2, calHouseCusp2, describeZodiac364, jdToZodiacTime } = sandbox;

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

// GET /api/planets?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19
app.get('/api/planets', (req, res) => {
    const { year, month, day, hour, minute, lon, lat } = req.query;

    if (!year || !month || !day || !hour || !minute || !lon || !lat) {
        return res.status(400).json({
            error: 'Missing parameters',
            required: ['year','month','day','hour','minute','lon','lat']
        });
    }

    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    const h = parseInt(hour), mi = parseInt(minute);
    const lo = parseFloat(lon), la = parseFloat(lat);

    const p = calPlanetPosition2(y, m, d, h, mi, lo, la);

    res.json({
        date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        time: `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`,
        location: { longitude: lo, latitude: la },
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
    });
});

// GET /api/zodiac - 364-part zodiac (revolution ultracopernicana)
app.get('/api/zodiac', (req, res) => {
    const { year, month, day, hour, minute, lon, lat } = req.query;

    if (!year || !month || !day || !hour || !minute || !lon || !lat) {
        return res.status(400).json({
            error: 'Missing parameters',
            required: ['year','month','day','hour','minute','lon','lat']
        });
    }

    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    const h = parseInt(hour), mi = parseInt(minute);
    const lo = parseFloat(lon), la = parseFloat(lat);

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

    res.json({
        date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        time: `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`,
        location: { longitude: lo, latitude: la },
        julianDay: parseFloat(p[0].toFixed(6)),
        description: 'Credible alternative to the 12-sign zodiac: 364 parts = 13 signs x 28, origin = real winter solstice',
        planets,
        points,
        minorPlanets,
        zodiacTime: t
    });
});

// GET /api/houses?year=...&month=...&day=...&hour=...&minute=...&lon=...&lat=...&system=1
app.get('/api/houses', (req, res) => {
    const { year, month, day, hour, minute, lon, lat, system } = req.query;
    const htype = parseInt(system) || 1;

    if (!year || !month || !day || !hour || !minute || !lon || !lat) {
        return res.status(400).json({
            error: 'Missing parameters',
            required: ['year','month','day','hour','minute','lon','lat']
        });
    }

    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    const h = parseInt(hour), mi = parseInt(minute);
    const lo = parseFloat(lon), la = parseFloat(lat);

    const c = calHouseCusp2(y, m, d, h, mi, lo, la, htype);

    const systemNames = {
        1: 'Placidus', 2: 'Campanus', 3: 'Regiomontanus',
        4: 'Koch', 5: 'Topocentric', 6: 'Axial', 7: 'Morinus'
    };

    const houses = {};
    for (let i = 1; i <= 12; i++) {
        houses[`house${i}`] = toZodiac(c[i]);
    }

    res.json({
        date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        time: `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`,
        location: { longitude: lo, latitude: la },
        system: { id: htype, name: systemNames[htype] || 'Unknown' },
        houses
    });
});

// GET /api/chart - everything in one call
app.get('/api/chart', (req, res) => {
    const { year, month, day, hour, minute, lon, lat, system } = req.query;
    const htype = parseInt(system) || 1;

    if (!year || !month || !day || !hour || !minute || !lon || !lat) {
        return res.status(400).json({
            error: 'Missing parameters',
            required: ['year','month','day','hour','minute','lon','lat']
        });
    }

    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    const h = parseInt(hour), mi = parseInt(minute);
    const lo = parseFloat(lon), la = parseFloat(lat);

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

    res.json({
        date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        time: `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`,
        location: { longitude: lo, latitude: la },
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
    });
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
    console.log('');
    console.log('Parameters: year, month, day, hour, minute, lon, lat');
    console.log('Optional: system (1-7) for house system');
});
