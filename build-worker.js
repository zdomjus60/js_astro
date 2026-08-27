#!/usr/bin/env node
// Build script: concatenates src/*.js into a single Cloudflare Worker file
const fs = require('fs');

const srcFiles = [
    'src/math.js',
    'src/astronomy.js',
    'src/geodata.js',
    'src/pluto.js',
    'src/hekichan.js',
    'src/metako.js',
    'src/cuspcal.js',
    'src/zodiac.js'
];

const handler = `
const ZODIAC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const ZODIAC_ABBR = ['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Ca','Aq','Pi'];
const HOUSE_NAMES = {1:'Placidus',2:'Campanus',3:'Regiomontanus',4:'Koch',5:'Topocentric',6:'Axial',7:'Morinus'};

function zodiac364Payload(p) {
    return {
        description: 'Credible alternative to the 12-sign zodiac: 364 parts = 13 signs x 28, origin = real winter solstice',
        julianDay: parseFloat(p[0].toFixed(6)),
        planets: {
            sun: describeZodiac364(p[1]),
            moon: describeZodiac364(p[2]),
            mercury: describeZodiac364(p[3]),
            venus: describeZodiac364(p[4]),
            mars: describeZodiac364(p[5]),
            jupiter: describeZodiac364(p[6]),
            saturn: describeZodiac364(p[7]),
            uranus: describeZodiac364(p[8]),
            neptune: describeZodiac364(p[9]),
            pluto: describeZodiac364(p[10])
        },
        points: {
            node: describeZodiac364(p[11]), apogee: describeZodiac364(p[12]),
            asc: describeZodiac364(p[13]), mc: describeZodiac364(p[14])
        },
        minorPlanets: {
            ceres: describeZodiac364(p[15]), pallas: describeZodiac364(p[16]),
            juno: describeZodiac364(p[17]), vesta: describeZodiac364(p[18]),
            chiron: describeZodiac364(p[19])
        },
        zodiacTime: jdToZodiacTime(p[0])
    };
}

function toZodiac(lon) {
    const l = ((lon % 360) + 360) % 360;
    const sign = Math.floor(l / 30);
    const deg = l % 30;
    const d = Math.floor(deg);
    const m = Math.floor((deg - d) * 60);
    const s = Math.floor(((deg - d) * 60 - m) * 60);
    return {
        longitude: parseFloat(lon.toFixed(4)),
        sign: ZODIAC[sign],
        abbr: ZODIAC_ABBR[sign],
        degree: d,
        minute: m,
        second: s,
        formatted: ZODIAC[sign] + ' ' + d + '\\u00b0' + String(m).padStart(2,'0') + "'" + String(s).padStart(2,'0') + '"'
    };
}

function planetsPayload(p) {
    return {
        julianDay: parseFloat(p[0].toFixed(6)),
        planets: {
            sun: toZodiac(p[1]), moon: toZodiac(p[2]), mercury: toZodiac(p[3]),
            venus: toZodiac(p[4]), mars: toZodiac(p[5]), jupiter: toZodiac(p[6]),
            saturn: toZodiac(p[7]), uranus: toZodiac(p[8]), neptune: toZodiac(p[9]),
            pluto: toZodiac(p[10])
        },
        points: {
            node: toZodiac(p[11]), apogee: toZodiac(p[12]),
            asc: toZodiac(p[13]), mc: toZodiac(p[14])
        },
        minorPlanets: {
            ceres: toZodiac(p[15]), pallas: toZodiac(p[16]), juno: toZodiac(p[17]),
            vesta: toZodiac(p[18]), chiron: toZodiac(p[19])
        }
    };
}

function parseParams(url) {
    const sp = new URLSearchParams(url.search);
    const required = ['year','month','day','hour','minute','lon','lat'];
    const out = {};
    for (const k of required) {
        const v = sp.get(k);
        if (v === null) return { error: 'Missing parameter: ' + k };
        out[k] = k === 'lon' || k === 'lat' ? parseFloat(v) : parseInt(v);
    }
    const id = { year: out.year, month: out.month, day: out.day,
                 hour: out.hour, minute: out.minute, lon: out.lon, lat: out.lat };
    if (isNaN(id.year) || isNaN(id.month) || isNaN(id.day) || isNaN(id.hour) ||
        isNaN(id.minute) || isNaN(id.lon) || isNaN(id.lat)) return { error: 'Invalid numeric values' };
    return { params: id, system: parseInt(sp.get('system') || '1') };
}

function json(res, body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

const homePage = \`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><title>js_astro API</title>
<style>
body{font-family:monospace;margin:30px;background:#1a1a2e;color:#e0e0e0}
h1{color:#00d4ff}a{color:#ffd700}code{background:#16213e;padding:2px 6px;border-radius:3px}
</style>
</head>
<body>
<h1>js_astro API (Cloudflare Workers)</h1>
<p>Astrological calculation - original by Yoshihiro Sakai, English translation fork.</p>
<h2>Endpoints</h2>
<p><strong>GET /api/planets</strong> - <a href="/api/planets?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19">test</a></p>
<p><strong>GET /api/houses</strong> - <a href="/api/houses?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19&system=1">test</a> (system 1-7)</p>
<p><strong>GET /api/chart</strong> - <a href="/api/chart?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19">test</a></p>
<p><strong>GET /api/zodiac</strong> - 364-part zodiac + zodiac time - <a href="/api/zodiac?year=1960&month=6&day=8&hour=19&minute=20&lon=11&lat=45.19">test</a> ✦ Ultracopernican</p>
<h2>Parameters</h2>
<code>year month day hour minute lon lat</code> (local time), optional <code>system</code> 1-7
<h2>House systems</h2>
1=Placidus 2=Campanus 3=Regiomontanus 4=Koch 5=Topocentric 6=Axial 7=Morinus
</body></html>\`;

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': '*' } });
        }
        if (path === '/' || path === '/index.html') {
            return new Response(homePage, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        const parsed = parseParams(url);
        if (parsed.error) return json(null, { error: parsed.error }, 400);

        const { params, system } = parsed;
        const { year, month, day, hour, minute, lon, lat } = params;

        const base = { date: year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0'),
                       time: String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0'),
                       location: { longitude: lon, latitude: lat } };

        if (path === '/api/planets') {
            const p = calPlanetPosition2(year, month, day, hour, minute, lon, lat);
            return json(null, Object.assign(base, planetsPayload(p)));
        }

        if (path === '/api/houses') {
            const c = calHouseCusp2(year, month, day, hour, minute, lon, lat, system);
            const houses = {};
            for (let i = 1; i <= 12; i++) houses['house' + i] = toZodiac(c[i]);
            return json(null, Object.assign(base, { houseSystem: { id: system, name: HOUSE_NAMES[system] || 'Unknown' }, houses }));
        }

        if (path === '/api/chart') {
            const p = calPlanetPosition2(year, month, day, hour, minute, lon, lat);
            const c = calHouseCusp2(year, month, day, hour, minute, lon, lat, system);
            const houses = {};
            for (let i = 1; i <= 12; i++) houses['house' + i] = toZodiac(c[i]);
            return json(null, Object.assign(base, planetsPayload(p),
                { houseSystem: { id: system, name: HOUSE_NAMES[system] || 'Unknown' }, houses }));
        }

        if (path === '/api/zodiac') {
            const p = calPlanetPosition2(year, month, day, hour, minute, lon, lat);
            return json(null, Object.assign(base, zodiac364Payload(p)));
        }

        return json(null, { error: 'Not found. Try /api/planets, /api/houses, /api/chart, /api/zodiac' }, 404);
    }
};
`;

const lib = srcFiles.map((f) => '/* ==== ' + f + ' ==== */\n' + fs.readFileSync(f, 'utf-8')).join('\n\n');
fs.writeFileSync('worker.js', '// Generated by build-worker.js - do not edit directly\n' + lib + '\n' + handler);
console.log('worker.js built OK (' + fs.statSync('worker.js').size + ' bytes)');