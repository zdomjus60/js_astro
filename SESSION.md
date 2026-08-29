# js_astro — Sessione di lavoro (Ultracopernicana)

> File di sessione per riprendere il lavoro da un nuovo opencode.
> Aggiornato: 29 ago 2026.

## Stato attuale (riepilogo rapido)

Progetto = **Rivoluzione Ultracopernicana**: zodiaco alternativo in **364 parti**
(13 segni × 28), origine = **solstizio d'inverno reale** (Sole a 0° Capricorno).
È un'**alternativa credibile**, NON una sostituzione dell'astrologia classica.

- **Live URL: https://js-astro-api.js-astro.workers.dev**
  (deployato con archivio completo città + interfaccia `/app` + CTA evidenziata
  in home, version `3b1d6107`, gzip 1923 KiB).
- ⚠️ **Bug datalist (fixato, version `00950cb5`)**: il `<datalist>` nativo
  nasconde le voci che non contengono la sottostringa digitata. Es. `padova`:
  l'API giustamente metteva Padua al 1° posto (alias curato `padova`), ma il
  browser filtrava via "Padua · Italy (IT)" lasciando solo Maserà di Padova /
  Villafranca Padovana → sembrava un errore di ricerca. Fix in `/app`
  `renderList`: se il nome non contiene il testo digitato, mostra
  `Nome (query)` (es. "Padua (Padova)"), così il filtro client lo accetta;
  il chip "Selected" mostra poi il nome canonico.
- ⚠️ **Decisione 2026-08-29**: discordanza tra `zodiacTime` (day 9) e
  posizione del Sole (day 10) per inizio gennaio. **NON è un bug**: il calendario
  conta unità di tempo uniformi (1/364 dell'anno), il Sole segue la velocità
  orbitale variabile (equazione del tempo; al perielio corre ~+1.7%). Scelta:
  **mantenere timestamp uniforme** + spiegare nell'UI. In `/app`:
  - bullet "Two honest meters" nel riquadro esplicativo (form e risultati);
  - nella card 364 una riga misura la divergenza corrente (Δ in giorni zodiacali
    ≈ ore convenzionali) e la spiega. (version `2a71cd32`)
- Home e README evidenziano il calcolatore: bottone grande "Open the online
  calculator" → `/app`; in cima al README link diretto al live `/app`.
- **Interfaccia utente `/app`** (`public/app.html`, unica fonte di verità):
  pagina HTML+JS servita sia dal worker sia da `server.js`; form dati/ora +
  luogo con **datalist nativo** (ricerca live su `/api/places`, disambiguazione
  omonimi) + coordinate manuali (con/tz); calcola chart / 364 / planets / houses
  e rende i risultati come testo leggibile. Link "Try the calculator interface"
  della home; `server.js`: `app.get('/app')` serve il file; `build-worker.js`
  lo incorpora via `JSON.stringify` (route `/app` e `/app.html`).
- Selezionando "Ultracopernican 364 zodiac" compare un **riquadro esplicativo**
  (`#zodiacNote`, "Why the 364 zodiac exists") sul perché esiste: precessione,
  origine = solstizio reale, 13×28, Ofiuco, "geometry rules, time adapts";
  riproposto anche in cima ai risultati 364 (`explainerHTML()`).
- ⚠️ Dopo il deploy le edge cache possono rispondere qualche secondo col
  vecchio bundle: ritestare se i lookup di città <100k danno count:0.
- Deploy: `node node_modules/wrangler/bin/wrangler.js deploy`
  (MAI npx/wrangler diretti: il disco non permette symlink npm).
- Worker bundle: `node build-worker.js` (concatena `srcFiles` → `worker.js`);
  sintassi: `node --check worker.js`. Server locale: `timeout 8 node server.js` (porta 3000).
- Test live validati: tz Europe/Rome 20:20→19:20 (+60), Asia/Tokyo 1960-06-09 04:20→
  1960-06-08 19:20 (+540), DMS `45°15'30"N`, `city=Isola+della+Scala&country=IT`,
  `/api/places?q=san jose` (US/CR/PH) e `q=東京`.

## Regole d'oro / convenzioni

- La geometria regna, il tempo si adatta (il secondo è convenzione scalabile).
- **Notazioni coordinate**: `lon`/`lat` accettano **gradi decimali** (`45.19`)
  E **gradi-minuti-secondi** (`45°15'30"N`, `45 15 30`, `45:15:30`, A/C/S/W).
  Parser condiviso in `src/coord.js` → `parseCoord`.
- Semantica `tz`: `hour/minute` = ora **civile locale** del luogo se c'è `tz`
  (IANA/OLSON, DST storica inclusa); **senza `tz`** l'ora è già UTC.
  La libreria engine lavora sempre in UTC.

## Dati di test (carta dell'utente)

- Nascita reale: **Isola della Scala (Verona)**, 08/06/1960, **20:20 locale = 19:20 UTC**
  (leggermente diversa dalla vecchia "Padova 19:20"). lon 11.0082, lat 45.2694.
- Verifiche tradizionali: Sun Gemini 17°58'13", Moon Sagittarius 7°27'02",
  ASC Sagittarius 23°08'14".
- Verifiche 364: Sun Cancer 1(+28) 50'12" (coord 169.8368), zodiacTime
  `Cancer 00 14:58:23`, giorno zodiacale ≈ 1.003414 conv., anno ≈ 365.2427 gg.

## Endpoint REST

| Endpoint | Note |
|---|---|
| `/` | home con documentazione API + link `/app` |
| `/app` | **interfaccia HTML leggibile** (form + datalist, senza JSON) |
| `/api/planets` | zodiaco classico 360° |
| `/api/houses` | cuspidi, `system` 1-7 |
| `/api/chart` | pianeti + punti + case |
| `/api/zodiac` | **364-part zodiac** + `zodiacTime` |
| `/api/places` | **ricerca luogo per nome** `q=roma&country=IT&limit=10` (omonimi) |

Parametri: `year month day hour minute` + posizione con **`lon`+`lat` (DD o DMS)
OPPURE `city`=nome + `country`=ISO 3166 opzionale** (risolve coordinate e tz).
Opzionali: `system`, `tz` (IANA/OLSON). Senza `tz` l'ora è UTC.
Risposta base include `location`, `resolved` (se da city), `localDate/Time`,
`utcDate/Time`, `utcOffsetMinutes`, `timeZone`.

## Lookup luoghi (GeoNames)

- `src/places.js` (generato da `node build-places.js`): **72324 città**
  (mondo pop≥5000 + IT pop≥1500) + **132816 alias** (alternatenames GeoNames:
  nomi locali brevi a 1 parola, ASCII + Unicode — **cap graduato**: 8 per città
  ≥500k, 4 per tutte le altre, quindi copre OGNI locatità nel DB) + **259 curati**
  (tabella `CURATED` per città famose in build-places.js: roma/milano/firenze/東京/Москва/...).
  Riga: `[name, asciiname, cc, lat, lon, ianaTz, pop]`; alias: `[aliasLower, idx]`.
  NB: più città sotto 500k ora hanno alias (es. `karaganda`→Karagandy KZ).
- `findPlace(city, cc)` e `searchPlaces(city, cc, limit)` — score per nome
  (alias/name esatti > prefisso > sottostringa), pareggio per popolazione.
  E.g. `san jose` → US, CR, PH; `roma` → Rome IT prima di Romano Banco/RU.
- Dati: GeoNames CC BY 4.0 (https://www.geonames.org/), `cities1000.zip` + `IT.zip`.
  File sorgente in `/tmp/cities1000.txt`, `/tmp/IT.txt` (riutilizzabili come argomenti).
- Limite bundle: ~2.6 MB gzip disponibili → pop≥5000 (~72k città, ~1.9 MB gzip)
  è il buon punto di equilibrio. Con gli alias estesi a tutte le città il worker
  è a **~2.75 MB gzip** (limite 3 MB; margine ~180 KB). Verificato con
  `gzip -c worker.js | wc -c` e col deploy (upload 9.6 MB / gzip 2887.50 KiB).
- Costo alias misurato: cap8 tutte le città = 1.24 MB gzip → SOVRAPASSA il
  limite; cap graduato (8/4) = ~853 KB gzip. Scelta: cap graduato.
- ⚠️ Chiave curata `Zuerich|CH` (asciiname del dataset è `Zuerich`, non `Zurich`).

## Guida utente (GUIDE.md)

- `GUIDE.md` (inglese, collegata dal README) — guida all'uso chiara per:
  utenti non tecnici (interfaccia `/app` passo-passo: dati/ora → luogo →
  calcolo → lettura risultati) e sviluppatori (REST API: parametri, esempi
  curl/Python requests/Python stdlib/JS fetch, disambiguazione omonimi,
  sistemi case, 364 via API, errori 400, run locale, carta di riferimento
  con valori verificati live). Esempi MOLTO verificati su live:
  `Cancer 00 14:58:23`, Sun `Cancer 1(+28) 50'12"`, ASC `Sagittarius 23°04'42"`
  (NB: differisce dai `23°08'14"` del vecchio README — verificato live).

## Time zone (src/tz.js)

- `utcWallMs`, `zoneWallMs`, `tzOffsetMinutes`, `isValidIANAZone`,
  `localCivilToUtc` (fixed-point sulla zona per gestire DST storiche).
- Bug risolti: `setUTCFullYear` ignora ora/min → si usa `setUTCHours` espliciti.
- tz sconosciuto → 400 con hint a https://www.iana.org/time-zones.

## Rate limiting (429)

- Motivazione (deepseek): il piano free Cloudflare NON include il prodotto Rate
  Limiting; guardia "buon cittadino del web" vs abusi accidentali (loop di
  refresh). Non è un confine di sicurezza (la memoria Map è per-isolate).
- Implementato in worker (`build-worker.js`, handler iniettato) E in `server.js`
  (middleware express). Finestra fissa per ora per IP, default **100/h**, override
  via env `RATE_LIMIT_PER_HOUR`. IP da `CF-Connecting-IP` (fallback
  `X-Forwarded-For`, poi `unknown` condiviso). OPTIONS non conteggiate.
- Risposta 429 JSON: `{error, perIpLimitPerHour, retryAfterSeconds}` + header
  `Retry-After: 3600`. Pulizia buckets oltre 20000.
- Testato: server locale (limite 5 → 5×200 poi 429 con Retry-After), worker
  offline ESM (env 3 → 3×200 poi 429), fairness IP diversi + fallback no-IP,
  live 3×200 con chart di riferimento invariata (Sun Gemini 17°58'13").
- Deploy live attuale: `dd936029-a08d-475d-940e-fc2cf455b44c` (gzip 2887.95 KiB).

## File chiave

- `src/zodiac.js` — modulo 364 (source of truth Rivoluzione). `lonToZodiac364`,
  `zodiac364ToLon`, `describeZodiac364`, `jdToZodiacTime`, `tropicalYearAt`,
  `winterSolsticeJD`. Dipende da `calPlaPos`/`correctTDT`/`calJDz`/`cnvCalendar`.
- `src/tz.js` — conversione local→UTC via `Intl`.
- `src/coord.js` — `parseCoord` (DMS | gradi decimali), convalidi min/sec in [0,60).
- `src/places.js` — indice GeoNames + alias (VEDI sopra).
- `build-places.js` — genera `src/places.js`; al suo interno: soglie pop,
  `buildAliases` (GeoNames, pop≥500k, ≤8 nazioni corte/1-parola), `CURATED`+`addCurated`.
- `build-worker.js` — concatena `srcFiles` (math, astronomy, geodata, pluto,
  hekichan, metako, cuspcal, zodiac, tz, coord, places) → `worker.js`;
  contiene `parseParams`, fetch handler (routes), `homePage` HTML.
- `server.js` — REST Express con sandbox vm (stessi file src); `resolveParams`,
  route `/api/places`, home HTML, log endpoint.
- `lettera/` (gitignored) — `lettera_sakai_{IT,EN,JP}.txt` aggiornate con
  tz/IANA, city/country, DMS e `/api/places`.
- `README.md` — sezione REST API + place search + notazioni coordinate.
- `worker.js` — bundle GENERATO (non editare; vedi comandi).
- `wrangler.toml` — `name=js-astro-api`, `main=worker.js`. Autenticazione OAuth
  in `/home/debian/.config/.wrangler/config/default.toml`
  (account `zdomjus60@gmail.com`, id `bdba2b8e19a45ae6ff5f0b599bcc745e`).

## Comandi utili

- Regenera luoghi: `node build-places.js` (e `node --check src/places.js`).
- Build worker: `node build-worker.js && node --check worker.js`.
- Test locali: `(timeout 9 node server.js &) ; sleep 1.8; curl -s 'http://localhost:3000/api/...'`.
- Deploy: `node node_modules/wrangler/bin/wrangler.js deploy`.
- `git status/diff` prima di eventuali commit (solo su richiesta esplicita).

## Stato git

- Commit `02ca63a` ("Add tz support, GeoNames city lookup and coordinate
  notation to API") PUSHATO su master (9 file, +41399). Worker bundle incluso.
- ⚠️ Bug lat/lon scambiati nel lookup `city` trovato e CORRETTO dopo il primo
  deploy (si usava `lo=pl[3];la=pl[4]` ma la riga è `[name,ascii,cc,lat,lon,tz,pop]`):
  ora `lo=pl[4];la=pl[3]` in `build-worker.js` e `server.js`. Redeployato
  (version `98e13b01`). Verifica: ASC Sagittarius 23°04'42" per Isola della Scala.
- `SESSION.md`, `AGENTS.md`, `lettera/`, scratch (`prova_workers.txt`, `test.txt`)
  NON tracciati. `lettera/` in .gitignore.
- ⬆️ **In corso (deployato ma NON committato)**: archivio città ampliato a
  **mondo pop≥5000 + IT pop≥1500 = 72324 città** (era 11463 a pop≥100000).
  Modificati `build-places.js`, `src/places.js`, `worker.js` (gzip 1917 KiB,
  entro il limite di 3 MB). Live: version `42875dbc`, verificato worongary AU
  e sasbach DE. Sorgenti in `/tmp/cities1000.txt` + `/tmp/IT.txt`.
- Precedenti: d3e5bc7 → faf2b9f → e3806b5 → 02ca63a.

## Da fare / possibili prossimi passi

1. Invio lettera a Sakai (issue https://github.com/astsakai/js_astro/issues
   o form https://astsakai.halfmoon.jp/ver5/contact — meglio JP; il sito filtra spam).
   Lettere aggiornate (tz/city/DMS/places) pronte in `lettera/`.
2. Invio BUGS.md/issue-draft all'upstream astsakai? (da confermare).
3. Front-end: search box con disambiguazione omonimi (usa `/api/places`).
4. Test astrologici più profondi nel sistema 364; aspetti in coordinate z;
   ruota delle case nel sistema 364.