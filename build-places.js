#!/usr/bin/env node
// build-places.js - generates src/places.js from the GeoNames cities1000 export
//
// Source data: GeoNames (CC BY 4.0) https://www.geonames.org/
// Export:     https://download.geonames.org/export/dump/cities1000.zip
//
// The generated index keeps all world cities with population >= MIN_POPULATION
// PLUS Italian populated places with population >= IT_MIN_POPULATION, so the
// whole of Italy is testable down to midsize comuni. Fields per city: name,
// asciiname, country, lat, lon, IANA time zone, population.
//
// The Cloudflare Workers Free plan caps the deployed script at 3 MB after
// gzip, and the rest of the bundle (astronomy + homes + routing) is about
// 0.34 MB gzipped. So the world-city threshold must keep the city table
// comfortably below ~2.6 MB gzipped. pop>=5000 (~69k cities, ~1.7 MB gzip)
// is a good balance: roughly 5x the old 100k threshold while still fitting.
//
// Usage: node build-places.js [world_file] [it_file]
// If a path is omitted and the file is not present next to the script, it is
// downloaded from geonames.org into /tmp.
const fs = require('fs');
const http = require('http');

const MIN_POPULATION = 5000;
const IT_MIN_POPULATION = 1500;
const OUT = 'src/places.js';

function fetch(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = http.get(url, (res) => {
            if (res.statusCode !== 200 && res.statusCode !== 302) {
                reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
                res.resume();
                return;
            }
            if (res.statusCode === 302) {
                file.close();
                reject(new Error('redirect not handled'));
                return;
            }
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        });
        req.on('error', reject);
    });
}

async function getSource(url, zip, txt, arg) {
    if (arg && fs.existsSync(arg)) return arg;
    const local = 'geonames/' + txt;
    if (fs.existsSync(local)) return local;
    console.log('Downloading ' + zip + ' from download.geonames.org ...');
    await fetch(url, '/tmp/' + zip);
    const { execSync } = require('child_process');
    execSync('cd /tmp && unzip -o -q ' + zip);
    return '/tmp/' + txt;
}

function loadCities(path, minPop) {
    console.log('Reading ' + path);
    const lines = fs.readFileSync(path, 'utf8').trim().split('\n');
    const cities = [];
    for (const line of lines) {
        const r = line.split('\t');
        if (r.length < 19 || r[6] !== 'P') continue;
        const pop = parseInt(r[14], 10) || 0;
        if (pop < minPop) continue;
        cities.push([r[1], r[2], r[8], parseFloat(r[4]), parseFloat(r[5]), r[17], pop, r[3]]);
    }
    return cities;
}

// Alternate-name aliases for every city in the index (population >=
// MIN_POPULATION), taken from the GeoNames alternatenames column.
// Both ASCII transliterations and the original Unicode scripts are kept
// (e.g. Roma, 東京, Москва, ローマ), so lookups work in many languages.
// The Cloudflare script limit (3 MB gzip) leaves room for roughly 850-900 KiB
// of aliases on top of the city table, so the per-city cap is graduated:
// up to ALIAS_CAP_BIG_N names for cities >= ALIAS_CAP_BIG population (the
// famous ones carry many variants) and ALIAS_CAP_SMALL_N for everyone else
// (small towns rarely have more than a handful of alternatenames anyway).
const ALIAS_CAP_BIG = 500000;
const ALIAS_CAP_BIG_N = 8;
const ALIAS_CAP_SMALL_N = 4;
// a name must contain at least one Unicode letter
const ALIAS_HAS_LETTER = /\p{L}/u;

function buildAliases(cities) {
    const list = [];
    const seen = new Set();
    for (let idx = 0; idx < cities.length; idx++) {
        const c = cities[idx];
        const cap = c[6] >= ALIAS_CAP_BIG ? ALIAS_CAP_BIG_N : ALIAS_CAP_SMALL_N;
        let n = 0;
        for (const a of String(c[7] || '').split(',')) {
            if (n >= cap) break;
            const t = a.trim();
            // keep only short, single-token local names (e.g. Roma, Milano,
            // 東京, Москва, ローマ); skip long descriptive transliterations
            if (t.length < 2 || t.length > 12) continue;
            if (/\s/.test(t)) continue;
            if (!ALIAS_HAS_LETTER.test(t)) continue;
            const k = t.toLowerCase();
            if (seen.has(k)) continue;
            if (k === c[0].toLowerCase() || k === c[1].toLowerCase()) continue;
            seen.add(k);
            list.push([k, idx]);
            n++;
        }
    }
    return { list, seen };
}

// Hand-picked alternate names for the most famous cities, added on top of the
// GeoNames-derived ones. Guarantees the local names people actually type work
// (Roma, Milano, Firenze, 東京, ロンドン, Москва, ...) and that the top result
// is the right city even when a name is shared with another country.
// id = GeoNames asciiname + '|' + countryCode
const CURATED = [
    ['Rome|IT',            ['roma', 'ローマ', 'рим', '罗马']],
    ['Milan|IT',           ['milano', 'милан', 'ミラノ', '米兰']],
    ['Florence|IT',        ['firenze', 'florencia', 'floransa', 'フィレンツェ', '佛罗伦萨']],
    ['Venice|IT',          ['venezia', 'venedig', 'venetia']],
    ['Naples|IT',          ['napoli']],
    ['Turin|IT',           ['torino']],
    ['Genoa|IT',           ['genova']],
    ['Palermo|IT',         ['palermo']],
    ['Bologna|IT',         ['bologna']],
    ['Verona|IT',          ['verona']],
    ['Pisa|IT',            ['pisa']],
    ['Padua|IT',           ['padova']],
    ['Trieste|IT',         ['trieste']],
    ['London|GB',          ['londra', 'ロンドン', 'лондон', '伦敦']],
    ['Paris|FR',           ['parigi', 'パリ', 'париж', '巴黎']],
    ['Berlin|DE',          ['berlino', 'берлин', 'ベルリン', '柏林']],
    ['Madrid|ES',          ['madri', 'мадрид', 'マドリード', '马德里']],
    ['Barcelona|ES',       ['barcellona', 'барселона', 'バルセロナ', '巴塞罗那']],
    ['Lisbon|PT',          ['lisbona', 'lisboa', 'лиссабон', 'リスボン']],
    ['Amsterdam|NL',       ['амстердам', 'アムステルダム']],
    ['Brussels|BE',        ['bruxelles', 'brüssel', 'брюссель', 'ブリュッセル']],
    ['Vienna|AT',          ['wien', 'вена', 'ウィーン']],
    ['Prague|CZ',          ['praga', 'прага', 'プラハ']],
    ['Budapest|HU',        ['будапешт', 'ブダペスト']],
    ['Warsaw|PL',          ['warszawa', 'варшава', 'ワルシャワ']],
    ['Bucharest|RO',       ['bucarest', 'bucuresti', 'бухарест']],
    ['Moscow|RU',          ['mosca', 'москва', 'モスクワ', '莫斯科']],
    ['Saint Petersburg|RU',['peterburg', 'pietroburgo', 'санкт-петербург', 'サンクトペテルブルク']],
    ['Kyiv|UA',            ['kiev', 'киев', 'київ', 'キーウ']],
    ['Istanbul|TR',        ['стамбул', 'イスタンブール']],
    ['Athens|GR',          ['atene', 'афины', 'アテネ']],
    ['Oslo|NO',            ['オスロ']],
    ['Stockholm|SE',       ['stoccolma', 'стокгольм', 'ストックホルム']],
    ['Copenhagen|DK',      ['copenaghen', 'копенгаген', 'コペンハーゲン']],
    ['Helsinki|FI',        ['helsingfors']],
    ['Dublin|IE',          ['dublino', 'дублин', 'ダブリン']],
    ['Zuerich|CH',         ['zurigo', 'zürich', 'цюрих']],
    ['Geneva|CH',          ['ginevra', 'женева', 'ジュネーヴ']],
    ['Tokyo|JP',           ['tokio', '東京', 'トーキョー', '东京']],
    ['Osaka|JP',           ['大阪', 'おおさか']],
    ['Kyoto|JP',           ['京都', 'きょうと']],
    ['Nagoya|JP',          ['名古屋']],
    ['Sapporo|JP',         ['札幌', 'サッポロ']],
    ['Fukuoka|JP',         ['福岡']],
    ['Kobe|JP',            ['神戸']],
    ['Hiroshima|JP',       ['広島', 'ひろしま']],
    ['Yokohama|JP',        ['横浜']],
    ['Seoul|KR',           ['서울', '首尔', 'ソウル']],
    ['Pyongyang|KP',       ['пхеньян', '平壌']],
    ['Beijing|CN',         ['pechino', '北京', 'ペキン', '北京']],
    ['Shanghai|CN',        ['sciangai', '上海', 'シャンハイ']],
    ['Guangzhou|CN',       ['广州', '廣州']],
    ['Shenzhen|CN',        ['深圳']],
    ['Hong Kong|HK',       ['honkong', '香港', 'ホンコン']],
    ['Taipei|TW',          ['taibei', '台北']],
    ['Delhi|IN',           ['デリー']],
    ['Mumbai|IN',          ['bombay', 'ムンバイ', 'मुंबई']],
    ['Chennai|IN',         ['madras', 'チェンナイ']],
    ['Kolkata|IN',         ['calcutta', 'コルカタ', 'কলকাতা']],
    ['Bengaluru|IN',       ['bangalore', 'バンガロール']],
    ['Hyderabad|IN',       ['ハイデラバード']],
    ['Karachi|PK',         ['カラチ']],
    ['Bangkok|TH',         ['バンコク']],
    ['Hanoi|VN',           ['ハノイ']],
    ['Ho Chi Minh City|VN',['saigon', 'サイゴン']],
    ['Kuala Lumpur|MY',    ['クアラルンプール']],
    ['Singapore|SG',       ['新加坡', 'シンガポール', '싱가포르']],
    ['Jakarta|ID',         ['ジャカルタ', 'джакарта']],
    ['Manila|PH',          ['マニラ', 'манила']],
    ['Sydney|AU',          ['シドニー', 'сидней']],
    ['Melbourne|AU',       ['メルボルン', 'мельбурн']],
    ['Perth|AU',           ['パース', 'перт']],
    ['Brisbane|AU',        ['ブリスベン']],
    ['Auckland|NZ',        ['オークランド']],
    ['Cairo|EG',           ['カイロ', 'каир']],
    ['Casablanca|MA',      ['касабланка', 'カサブランカ']],
    ['Algiers|DZ',         ['алжир', 'アルジェ']],
    ['Tunis|TN',           ['tunisi']],
    ['Lagos|NG',           ['лагос', 'ラゴス']],
    ['Nairobi|KE',         ['ナイロビ', 'найроби']],
    ['Johannesburg|ZA',    ['joburg', 'йоханнесбург']],
    ['Riyadh|SA',          ['リヤド']],
    ['Dubai|AE',           ['ドバイ', 'дубай']],
    ['Abu Dhabi|AE',       ['アブダビ']],
    ['Tehran|IR',          ['テヘラン', 'тегеран']],
    ['Baghdad|IQ',         ['багдад', 'バグダッド']],
    ['Jerusalem|IL',       ['エルサレム']],
    ['Tel Aviv|IL',        ['телль-авив', 'テルアビブ']],
    ['Amman|JO',           ['амман']],
    ['Beirut|LB',          ['bayrut', 'бейрут', 'ベイルート']],
    ['Damascus|SY',        ['damasco', 'дамаск', 'ダマスカス']],
    ['Ankara|TR',          ['анкара', 'アンカラ']],
    ['Mexico City|MX',     ['mexico', 'メキシコシティ']],
    ['Guadalajara|MX',     ['гвадалахара', 'グアダラハハ']],
    ['Bogota|CO',          ['bogotá', 'богота', 'ボゴタ']],
    ['Medellin|CO',        ['медельин', 'メデジン']],
    ['Lima|PE',            ['リマ']],
    ['Buenos Aires|AR',    ['baires', 'буэнос-айрес', 'ブエノスアイレス']],
    ['Santiago|CL',        ['сантьяго', 'サンティアゴ']],
    ['Caracas|VE',         ['каракас', 'カラカス']],
    ['Quito|EC',           ['кито', 'キト']],
    ['La Paz|BO',          ['ラパス']],
    ['Montevideo|UY',      ['монтевидео', 'モンテビデオ']],
    ['San Juan|PR',        ['サンフアン']],
    ['Havana|CU',          ['habana', 'гавана', 'ハバナ']],
    ['Santo Domingo|DO',   ['サントドミンゴ']],
    ['Guatemala City|GT',  ['グアテマラ']],
    ['Toronto|CA',         ['トロント', 'торонто']],
    ['Montreal|CA',        ['montréal', 'монреаль', 'モントリオール']],
    ['Vancouver|CA',       ['ванкувер', 'バンクーバー']],
    ['Calgary|CA',         ['кальгари', 'カルガリー']],
    ['Ottawa|CA',          ['оттава', 'オタワ']],
    ['New York City|US',   ['new york', 'nyc', 'нью-йорк', 'ニューヨーク', '纽约']],
    ['Los Angeles|US',     ['лос-анджелес', 'ロサンゼルス', '洛杉矶']],
    ['Chicago|US',         ['чикаго', 'シカゴ', '芝加哥']],
    ['Houston|US',         ['хьюстон', 'ヒューストン']],
    ['Philadelphia|US',    ['филадельфия', 'フィラデルフィア']],
    ['Phoenix|US',         ['финикс', 'フェニックス']],
    ['San Antonio|US',     ['サンアントニオ']],
    ['San Diego|US',       ['сан-диего', 'サンディエゴ']],
    ['Dallas|US',          ['даллас', 'ダラス']],
    ['San Jose|US',        ['сан-хосе', 'サンノゼ']],
    ['Austin|US',          ['オースティン']],
    ['San Francisco|US',   ['сан-франциско', 'サンフランシスコ', '旧金山']],
    ['Indianapolis|US',    ['インディアナポリス']],
    ['Seattle|US',         ['сиэтл', 'シアトル']],
    ['Denver|US',          ['денвер', 'デンバー']],
    ['Boston|US',          ['бостон', 'ボストン']],
    ['Washington|US',      ['вашингтон', 'ワシントン']],
    ['Detroit|US',         ['детройт', 'デトロイト']],
    ['Las Vegas|US',       ['лас-вегас', 'ラスベガス']],
    ['Miami|US',           ['майами', 'マイアミ']],
    ['Atlanta|US',         ['атланта', 'アトランタ']],
    ['Portland|US',        ['ポートランド']],
    ['Honolulu|US',        ['ホノルル']]
];

function addCurated(unique, aliases, seen) {
    const idxIds = {};
    unique.forEach((c, i) => { idxIds[(c[1] + '|' + c[2]).toLowerCase()] = i; });
    let added = 0;
    for (const [id, names] of CURATED) {
        const idx = idxIds[id.toLowerCase()];
        if (idx === undefined) {
            console.warn('WARN curated key not found in dataset: ' + id);
            continue;
        }
        const c = unique[idx];
        for (const nm of names) {
            const k = nm.toLowerCase();
            if (seen.has(k)) continue;
            if (k === c[0].toLowerCase() || k === c[1].toLowerCase()) continue;
            seen.add(k);
            aliases.push([k, idx]);
            added++;
        }
    }
    return added;
}

(async () => {
    const [worldArg, itArg] = process.argv.slice(2);
    const worldSrc = await getSource(
        'http://download.geonames.org/export/dump/cities1000.zip',
        'cities1000.zip', 'cities1000.txt', worldArg);
    const itSrc = await getSource(
        'http://download.geonames.org/export/dump/IT.zip',
        'IT.zip', 'IT.txt', itArg);

    const cities = loadCities(worldSrc, MIN_POPULATION).concat(loadCities(itSrc, IT_MIN_POPULATION));
    const seen = {};
    const unique = [];
    for (const c of cities) {
        const key = c[1].toLowerCase() + '|' + c[2] + '|' + c[3].toFixed(1) + '|' + c[4].toFixed(1);
        if (seen[key]) continue;
        seen[key] = true;
        unique.push(c);
    }
    unique.sort((a, b) => b[6] - a[6]);
    const { list: aliases, seen: seenAlias } = buildAliases(unique);
    const curatedAdded = addCurated(unique, aliases, seenAlias);
    const rows = unique.map((c) => JSON.stringify([c[0], c[1], c[2], +c[3].toFixed(4), +c[4].toFixed(4), c[5], c[6]]));
    const aliasRows = aliases.map((a) => JSON.stringify(a));
    const out =
        '/*\n' +
        ' * places - compact world city index for place-name lookup\n' +
        ' * World cities with population >= ' + MIN_POPULATION + ' plus all Italian\n' +
        ' * populated places, derived from GeoNames.\n' +
        ' * Data: GeoNames, licensed under a Creative Commons Attribution 4.0\n' +
        ' * License (CC BY 4.0) - https://www.geonames.org/\n' +
        ' * Regenerate with: node build-places.js\n' +
        ' * Each row: [name, asciiname, countryCode, latitude, longitude, ianaTimeZone, population]\n' +
        ' */\n' +
        'var GEO_CITIES = [\n' +
        rows.join(',\n') +
        '\n];\n\n' +
        '// City aliases (alternate names in various scripts, for every city)\n' +
        '// [aliasLower, indexIntoGEO_CITIES]\n' +
        'var GEO_ALIASES = [\n' +
        aliasRows.join(',\n') +
        '\n];\n\n' +
        '// Look up a place by name (case-insensitive; exact or prefix match on the\n' +
        '// main/ASCII name, exact match on alternate-name aliases). country\n' +
        '// (ISO-3166 alpha-2) narrows the search. Returns the row with the largest\n' +
        '// population, or null when nothing matches.\n' +
        'function findPlace(city, country) {\n' +
        '    var q = String(city || \'\').toLowerCase().trim();\n' +
        '    if (q === \'\') return null;\n' +
        '    var cc = country ? String(country).toUpperCase() : \'\';\n' +
        '    for (var i = 0; i < GEO_ALIASES.length; i++) {\n' +
        '        var al = GEO_ALIASES[i];\n' +
        '        if (al[0] === q) {\n' +
        '            var r = GEO_CITIES[al[1]];\n' +
        '            if (cc === \'\' || r[2] === cc) return r;\n' +
        '        }\n' +
        '    }\n' +
        '    var best = null;\n' +
        '    var bestScore = -1;\n' +
        '    for (var j = 0; j < GEO_CITIES.length; j++) {\n' +
        '        var c = GEO_CITIES[j];\n' +
        '        if (cc !== \'\' && c[2] !== cc) continue;\n' +
        '        var n = c[0].toLowerCase();\n' +
        '        var a = c[1].toLowerCase();\n' +
        '        var sc = (n === q || a === q) ? 2 : (n.indexOf(q) === 0 || a.indexOf(q) === 0) ? 1 : 0;\n' +
        '        if (sc === 0) continue;\n' +
        '        if (sc > bestScore || (sc === bestScore && best && c[6] > best[6])) {\n' +
        '            best = c;\n' +
        '            bestScore = sc;\n' +
        '        }\n' +
        '    }\n' +
        '    return best;\n' +
        '}\n\n' +
        '// Search candidates for a place name (case-insensitive). Exact name/alias\n' +
        '// matches rank first, then prefix, then substring; ties are broken by\n' +
        '// population. Returns up to `limit` (default 10, max 50) rows as plain\n' +
        '// objects, so a client can pick the correct location when the same name\n' +
        '// exists in different countries (e.g. Rome, IT vs Rome, US).\n' +
        'function searchPlaces(city, country, limit) {\n' +
        '    var q = String(city || \'\').toLowerCase().trim();\n' +
        '    if (q === \'\') return [];\n' +
        '    var cc = country ? String(country).toUpperCase() : \'\';\n' +
        '    var lim = (typeof limit === \'number\' && limit > 0) ? Math.min(Math.floor(limit), 50) : 10;\n' +
        '    var best = {};\n' +
        '    var i, j, c;\n' +
        '    for (i = 0; i < GEO_ALIASES.length; i++) {\n' +
        '        var al = GEO_ALIASES[i];\n' +
        '        if (al[0] !== q) continue;\n' +
        '        c = GEO_CITIES[al[1]];\n' +
        '        if (cc !== \'\' && c[2] !== cc) continue;\n' +
        '        if (!Object.prototype.hasOwnProperty.call(best, al[1]) || best[al[1]] < 4) best[al[1]] = 4;\n' +
        '    }\n' +
        '    for (j = 0; j < GEO_CITIES.length; j++) {\n' +
        '        c = GEO_CITIES[j];\n' +
        '        if (cc !== \'\' && c[2] !== cc) continue;\n' +
        '        var n = c[0].toLowerCase();\n' +
        '        var a = c[1].toLowerCase();\n' +
        '        var sc = (n === q || a === q) ? 4 : (n.indexOf(q) === 0 || a.indexOf(q) === 0) ? 3 : (n.indexOf(q) !== -1 || a.indexOf(q) !== -1) ? 1 : 0;\n' +
        '        if (sc === 0) continue;\n' +
        '        if (!Object.prototype.hasOwnProperty.call(best, j) || best[j] < sc) best[j] = sc;\n' +
        '    }\n' +
        '    var rows = [];\n' +
        '    for (var k in best) {\n' +
        '        if (Object.prototype.hasOwnProperty.call(best, k)) rows.push([k, best[k]]);\n' +
        '    }\n' +
        '    rows.sort(function (x, y) {\n' +
        '        if (y[1] !== x[1]) return y[1] - x[1];\n' +
        '        var px = GEO_CITIES[x[0]], py = GEO_CITIES[y[0]];\n' +
        '        if (py[6] !== px[6]) return py[6] - px[6];\n' +
        '        if (px[0] < py[0]) return -1;\n' +
        '        if (px[0] > py[0]) return 1;\n' +
        '        return 0;\n' +
        '    });\n' +
        '    var out = [];\n' +
        '    for (var m = 0; m < rows.length && m < lim; m++) {\n' +
        '        var r = GEO_CITIES[rows[m][0]];\n' +
        '        out.push({ name: r[0], country: r[2], latitude: r[3], longitude: r[4],\n' +
        '                   timeZone: r[5], population: r[6] });\n' +
        '    }\n' +
        '    return out;\n' +
        '}\n';
    fs.writeFileSync(OUT, out);
    console.log('Wrote ' + OUT + ' (' + unique.length + ' cities, ' + aliases.length + ' aliases (+' + curatedAdded + ' curated), ' + out.length + ' bytes)');
})();