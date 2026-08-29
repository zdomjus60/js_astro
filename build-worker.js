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
    'src/zodiac.js',
    'src/tz.js',
    'src/coord.js',
    'src/places.js'
];

const appPage = fs.readFileSync('public/app.html', 'utf-8');

const handler = `
const APP_PAGE = ${JSON.stringify(appPage)};

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
    const required = ['year','month','day','hour','minute'];
    const out = {};
    for (const k of required) {
        const v = sp.get(k);
        if (v === null) return { error: 'Missing parameter: ' + k };
        out[k] = parseInt(v);
    }
    const id = { year: out.year, month: out.month, day: out.day,
                 hour: out.hour, minute: out.minute };
    if (isNaN(id.year) || isNaN(id.month) || isNaN(id.day) || isNaN(id.hour) ||
        isNaN(id.minute)) return { error: 'Invalid numeric values' };

    // Location: either lon+lat (decimal degrees or degrees-minutes-seconds)
    // or city=<name> with optional country=<ISO-3166 alpha-2>.
    const lonS = sp.get('lon'), latS = sp.get('lat');
    const city = sp.get('city');
    const hasCity = typeof city === 'string' && city.trim() !== '';
    const hasLon = typeof lonS === 'string' && lonS.trim() !== '';
    const hasLat = typeof latS === 'string' && latS.trim() !== '';
    if (!hasCity && !(hasLon && hasLat))
        return { error: 'Provide lon+lat (decimal or DMS) or city (country optional)' };
    if (!hasCity && hasLon !== hasLat)
        return { error: 'Provide both lon and lat together' };

    const lon = hasLon ? parseCoord(lonS) : NaN;
    const lat = hasLat ? parseCoord(latS) : NaN;
    if (hasLon && (isNaN(lon) || isNaN(lat)))
        return { error: "Invalid lon/lat (use decimal degrees or DMS, e.g. 45\u00b015'30\\"N)" };

    const country = sp.get('country');
    const tz = sp.get('tz');
    return { params: id, system: parseInt(sp.get('system') || '1'),
             lon: hasLon ? lon : null, lat: hasLat ? lat : null,
             city: hasCity ? city.trim() : null,
             country: (typeof country === 'string' && country.trim() !== '') ? country.trim() : null,
             tz: (typeof tz === 'string' && tz !== '') ? tz : null };
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
.cta{display:inline-block;margin:18px 0 4px;padding:16px 26px;background:#00d4ff;color:#0b1420;font-weight:bold;font-size:18px;text-decoration:none;border-radius:8px;border:2px solid #00e6ff;box-shadow:0 0 18px rgba(0,212,255,.35)}
.cta:hover{background:#33ddff;box-shadow:0 0 26px rgba(0,212,255,.55)}
.cta-sub{color:#9aa4b8;font-size:13px;margin:6px 0 10px}
</style>
</head>
<body>
<h1>js_astro API (Cloudflare Workers)</h1>
<p>Astrological calculation - original by Yoshihiro Sakai, English translation fork.</p>
<p><a class="cta" href="/app">&#128640; Open the online calculator</a></p>
<p class="cta-sub">For everyone: pick a date and time, search your city - the chart and the Ultracopernican 364 zodiac are explained in readable text. No technical knowledge needed.</p>
<h2>Endpoints</h2>
<p><strong>GET /api/planets</strong> - <a href="/api/planets?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome">test</a></p>
<p><strong>GET /api/houses</strong> - <a href="/api/houses?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome&system=1">test</a> (system 1-7)</p>
<p><strong>GET /api/chart</strong> - <a href="/api/chart?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome">test</a></p>
<p><strong>GET /api/zodiac</strong> - 364-part zodiac + zodiac time - <a href="/api/zodiac?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome">test</a> ✦ Ultracopernican</p>
<p><strong>GET /api/places</strong> - search a place by name (when the same name exists in several countries, e.g. San Jose) - <a href="/api/places?q=roma">test rag</a> / <a href="/api/places?q=san%20jose">test san jose</a></p>
<h2>Parameters</h2>
<code>year month day hour minute</code> (local civil time of the birthplace). Location: <code>lon</code>+<code>lat</code> as decimal degrees (<code>45.19</code>) <em>or</em> degrees-minutes-seconds (<code>45\u00b015'30"N</code>) — <strong>or</strong> <code>city</code>=name with optional <code>country</code>=ISO code (the API resolves coordinates/time zone automatically, e.g. <code>city=Firenze&amp;country=IT</code>). Optional <code>system</code> 1-7, optional <code>tz</code> = IANA (OLSON) zone name (e.g. <code>Europe/Rome</code>, <code>Asia/Tokyo</code>). The API converts <code>hour/minute</code> from local time to UTC automatically; without <code>tz</code> the entered time is treated as UTC. See the <a href="https://www.iana.org/time-zones">IANA Time Zone Database</a>.</p>
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
        if (path === '/app' || path === '/app.html') {
            return new Response(APP_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        if (path === '/api/places') {
            const q = url.searchParams.get('q') || '';
            const cc = url.searchParams.get('country') || null;
            const lim = parseInt(url.searchParams.get('limit') || '10', 10);
            if (String(q).trim() === '')
                return json(null, { error: 'Missing parameter: q', hint: '/api/places?q=roma&country=IT' }, 400);
            const results = searchPlaces(String(q).trim(), cc, isNaN(lim) ? 10 : lim);
            return json(null, { query: q, country: cc || '', count: results.length, results });
        }

        const parsed = parseParams(url);
        if (parsed.error) return json(null, { error: parsed.error }, 400);

        const { params, system } = parsed;
        let { year, month, day, hour, minute } = params;
        let lon = parsed.lon, lat = parsed.lat;
        let effTz = parsed.tz;

        const pad2 = (v) => String(v).padStart(2, '0');
        const base = { date: year + '-' + pad2(month) + '-' + pad2(day),
                       time: pad2(hour) + ':' + pad2(minute) };

        if (parsed.city) {
            const pl = findPlace(parsed.city, parsed.country);
            if (!pl) return json(null, {
                error: 'Unknown place: ' + parsed.city + (parsed.country ? ' (' + parsed.country + ')' : ''),
                hint: 'Use /api/places?q=... to find the exact location and its country code'
            }, 400);
            lon = pl[4]; lat = pl[3];
            base.resolved = { name: pl[0], country: pl[2], population: pl[6] };
            if (!effTz) effTz = pl[5];
        }
        base.location = { longitude: lon, latitude: lat };

        if (effTz) {
            if (!isValidIANAZone(effTz)) {
                return json(null, { error: 'Unknown IANA time zone: ' + effTz,
                                    hint: 'Zone names come from the IANA (OLSON) database: https://www.iana.org/time-zones' }, 400);
            }
            const conv = localCivilToUtc(year, month, day, hour, minute, effTz);
            base.timeZone = effTz;
            base.localDate = base.date;
            base.localTime = base.time;
            base.utcDate = conv.year + '-' + pad2(conv.month) + '-' + pad2(conv.day);
            base.utcTime = pad2(conv.hour) + ':' + pad2(conv.minute);
            base.utcOffsetMinutes = conv.offsetMinutes;
            year = conv.year; month = conv.month; day = conv.day;
            hour = conv.hour; minute = conv.minute;
        } else {
            base.utcDate = base.date;
            base.utcTime = base.time;
        }

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