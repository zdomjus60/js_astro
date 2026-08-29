# AGENTS.md

Session/journal so a fresh opencode session can resume instantly.

## Read first
- **`SESSION.md`** — full state, live URL, credentials notes, endpoints, next steps.

## Lingua e tono
- L'utente parla **italiano**: rispondere in italiano.
- Progetto = **Rivoluzione Ultracopernicana**: zodiaco alternativo in **364 parti**
  (13 segni × 28), origine = **solstizio d'inverno reale** (Sole a 0° Capricorno).
- È un'**alternativa credibile**, NON una sostituzione dell'astrologia classica.
  Mantenere sempre visibile il legame tra astronomia e astrologia.
- Regola d'oro: **la geometria regna, il tempo si adatta** (il secondo è una
  convenzione scalabile; mai piegare il cielo al calendario).

## Comandi (ambiente vincolato)
- Il disco del progetto non consente symlink da npm: usare
  `node node_modules/wrangler/bin/wrangler.js ...` (MAI npx/wrangler diretti).
- Worker: rigenerare con `node build-worker.js` (concateno src → `worker.js`).
  `node --check worker.js` per sintassi.
- Test API: `timeout 8 node server.js` (porta 3000) + `curl`.
- Test worker offline: copiare `worker.js` in `/tmp/worker_test.mjs` e importarlo
  come modulo ESM (`import { pathToFileURL } from 'url'`).

## File dove scrivere/leggere
- `src/zodiac.js` — modulo 364 (source of truth della Rivoluzione).
- `build-worker.js` — concatena `srcFiles` (INCLUDE `src/zodiac.js`) e contiene
  home HTML + routing del worker.
- `server.js` — REST Express (endpoint identici + home).
- `wrangler.toml` — config Cloudflare Worker.

## Dati di test
- Carta utente: 08/06/1960, 19:20 locale, Padova lon 11.0 E lat 45.19 N.
- Attese: Sun Gemini 17°58'13"; 364: Sun Cancer 1(+28) 50'12", tempo
  Cancer 00 14:58:23, anno zodiacale ≈ 365.2427 giorni.