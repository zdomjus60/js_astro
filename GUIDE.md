# js_astro — Usage Guide

There are two ways to get an astrological chart out of this project:

1. **The web calculator** — a readable, click-through interface. Perfect if you
   just want a chart, in one minute, with no code at all.
2. **The REST API** — plain HTTP calls. Perfect if you are a developer and want
   to use it from Python, JavaScript, curl, or any other language.

Both talk to the same engine and give the same results: planetary positions,
house cusps, and the [Ultracopernican 364-part zodiac](#9-the-364-part-zodiac-via-api).
The engine also states its own philosophy: **geometry rules, time adapts** — the
364 zodiac is a credible alternative (built from the real sky), not a replacement
for classical astrology.

---

## 1. The web calculator — for everyone

Open this address in any modern browser (desktop or phone):

> **https://js-astro-api.js-astro.workers.dev/app**

No installation, no account, no technical knowledge required.

### 1.1 Step 1 — Date and time

Enter **year, month, day, hour, minute** of the moment you want the chart for
(classically: the moment of birth). This is the **local clock time** of the
place — the service converts it to UTC automatically, including historical
daylight-saving rules.

### 1.2 Step 2 — Place

Type a city into the search box. The lookup speaks many languages and scripts —
`Mestre`, `Roma`, `London`, `Tokyo`, `Москва`, `東京` all work. While you type,
a dropdown shows matching places; **pick the one from the list** (this also
resolves homonyms — *San Jose* exists in the US, Costa Rica and the Philippines).

After you pick a city, a small chip appears with the resolved coordinates, e.g.
`Venice, IT · 45.408, 11.8859 · Europe/Rome`. That means the location is locked in.

Only if you need very precise coordinates, click **“…or enter coordinates
manually”** and type longitude and latitude (decimal like `45.408`, or
degrees-minutes-seconds like `45°15'30"N`), plus an optional IANA time zone
(`Europe/Rome`). Without a time zone, the date/time above is treated as **UTC**.

> Shortcut: the **“Load example”** button fills the fields with a reference
> chart (1 Jan 2010 12:00, Mestre, Italy) so you can see the tool working.

### 1.3 Step 3 — What to compute

| Choice | What you get |
|---|---|
| **Full chart (classical 360°)** | Planets, points (Ascendant, MC, Node, Apogee), minor planets and all 12 house cusps |
| **Ultracopernican 364 zodiac** | The same sky in 364 parts (13 signs × 28) + the zodiac time — with a short “why it exists” note |
| **Planet positions** | Just the planets and points |
| **Houses only** | Just the 12 house cusps — pick the house system |

Click **Calculate**.

### 1.4 Reading the results

- The **meta row** recaps date, time, place, UTC conversion and time zone — the
  honest input of the calculation.
- **Tables** list planets and points with their sign, degree and longitude
  (`Sun · Gemini 17°58'13" · 77.97°)`.
- Choosing the **364 zodiac** shows a big card with the Sun’s position in the
  364-part cycle (e.g. `Cancer 1(+28) 50'12"`) and the **zodiac time**
  (`Cancer 00 14:58:23`), plus an honest note about the small, expected
  difference between the calendar and the Sun’s actual speed (“two honest
  meters”).

### 1.5 If something looks wrong

- Check that you picked a place from the dropdown (the chip appears).
- Check the meta row: if the UTC time looks shifted, the time zone was resolved
  differently than you expected — you can override it with manual coordinates +
  explicit `tz`.
- The engine computes for the years it covers (0–4000); beyond that it refuses
  politely.

**Footer note:** place data comes from GeoNames (CC BY 4.0); the astronomy is
computed server-side on every request.

---

## 2. The REST API — for developers

The same service as plain HTTP + JSON. Use it from Python, Node, curl, Rust,
Go, Excel… anything that can speak HTTP.

### 2.1 Base URLs

- **Live:** `https://js-astro-api.js-astro.workers.dev`
- **Local:** `http://localhost:3000` (run `timeout 8 node server.js`)

Responses always include `Access-Control-Allow-Origin: *`, so you can call the
live API straight from browser JavaScript too.

### 2.2 Quick start

```bash
curl 'https://js-astro-api.js-astro.workers.dev/api/chart?year=1960&month=6&day=8&hour=20&minute=20&city=Isola+della+Scala&country=IT'
```

A city may contain spaces — use `+` (as above) or URL-encode (`Isola%20della%20Scala`).

### 2.3 Parameters

**Required** — the local civil date/time of the event:

| Param | Meaning |
|---|---|
| `year` | year (0–4000) |
| `month` | 1–12 |
| `day` | 1–31 |
| `hour` | 0–23 |
| `minute` | 0–59 |

**Location — one of these two ways:**

| Way | Params |
|---|---|
| By city | `city=<name>` + optional `country=<ISO-3166 alpha-2>` (e.g. `IT`). Coordinates + IANA time zone resolved automatically. |
| By coordinates | `lon` + `lat`, decimal degrees (`11`, `45.19`) **or** DMS (`11°00'00"E`, `45°15'30"N`, `45:15:30`). |

**Optional:**

| Param | Meaning |
|---|---|
| `tz` | IANA time zone name (`Europe/Rome`, `Asia/Tokyo`). See note below. |
| `system` | House system, 1–7 (default 1, Placidus). |
| `country` | (with `city` or `q`) ISO-3166 alpha-2 to narrow the lookup. |
| `limit` | (`/api/places`) max results, 1–50, default 10. |

**How time is interpreted:**

- If `tz` is given → `hour/minute` are **local** and converted to UTC (historical
  DST included).
- If `city` is resolved → its time zone is applied, so `hour/minute` are **local**.
- If neither → `hour/minute` are treated as **UTC already**.

### 2.4 Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/planets` | Planets, points (ASC/MC/Node/Apogee) and minor planets in the classical 360° zodiac. |
| `GET /api/houses` | The 12 house cusps (`system=1`–7). |
| `GET /api/chart` | Planets + houses in a single call (the most complete). |
| `GET /api/zodiac` | The Ultracopernican 364 zodiac + zodiac time. |
| `GET /api/places` | Search/verify a place and disambiguate homonyms. |

Example — house cusps:

```bash
curl 'https://js-astro-api.js-astro.workers.dev/api/houses?year=1960&month=6&day=8&hour=20&minute=20&city=Isola+della+Scala&country=IT&system=1'
```

### 2.5 Response format

Every reply carries the resolved input first, so results are always traceable:

```json
{
  "date": "1960-06-08",
  "time": "20:20",
  "utcDate": "1960-06-08",
  "utcTime": "19:20",
  "timeZone": "Europe/Rome",
  "location": { "longitude": 11.0082, "latitude": 45.2694 },
  "resolved": { "name": "Isola della Scala", "country": "IT", "population": 8348 },
  "planets": {
    "sun":   { "longitude": 77.9704, "sign": "Gemini", "abbr": "Ge",
               "degree": 17, "minute": 58, "second": 13,
               "formatted": "Gemini 17°58'13\"" },
    "moon":  { ... }
  },
  "points": { "asc": { ... }, "mc": { ... }, "node": { ... }, "apogee": { ... } },
  "minorPlanets": { "ceres": { ... }, "pallas": { ... }, "juno": { ... },
                    "vesta": { ... }, "chiron": { ... } },
  "houses": {
    "house1":  { "longitude": 263.0784, "sign": "Sagittarius", ... },
    "house10": { ... }
  },
  "houseSystem": { "id": 1, "name": "Placidus" },
  "julianDay": 2437094.30594
}
```

### 2.6 Examples in different languages

**Python** (with the `requests` package — `pip install requests`):

```python
import requests

BASE = "https://js-astro-api.js-astro.workers.dev"
params = {
    "year": 1960, "month": 6, "day": 8,
    "hour": 20, "minute": 20,
    "city": "Isola della Scala", "country": "IT",
}
r = requests.get(BASE + "/api/chart", params=params)
r.raise_for_status()
data = r.json()

sun = data["planets"]["sun"]
print("Sun:", sun["formatted"])            # Gemini 17°58'13"
print("ASC:", data["houses"]["house1"]["formatted"])
print("UTC:", data["utcDate"], data["utcTime"], data["timeZone"])
```

**Python** (standard library only, no dependencies):

```python
import json
from urllib.parse import urlencode
from urllib.request import urlopen

BASE = "https://js-astro-api.js-astro.workers.dev"
params = urlencode({
    "year": 1960, "month": 6, "day": 8,
    "hour": 20, "minute": 20,
    "lon": "11", "lat": "45.19", "tz": "Europe/Rome",
})
with urlopen(BASE + "/api/zodiac?" + params) as resp:
    data = json.load(resp)
print("Zodiac time:", data["zodiacTime"]["formatted"])   # Cancer 00 14:58:23
```

**JavaScript / Node**:

```js
const url = new URL("https://js-astro-api.js-astro.workers.dev/api/chart");
url.searchParams.set("year", "1960");
url.searchParams.set("month", "6");
url.searchParams.set("day", "8");
url.searchParams.set("hour", "20");
url.searchParams.set("minute", "20");
url.searchParams.set("city", "Tokyo");      // resolves coordinates + Asia/Tokyo

const data = await fetch(url).then((r) => r.json());
console.log(data.planets.sun.formatted);
```

**curl** (with coordinates and a house system):

```bash
curl 'https://js-astro-api.js-astro.workers.dev/api/chart?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome&system=1'
```

> Everything shown applies to any HTTP client — the API returns plain JSON.

### 2.7 Finding the right place (homonyms)

`/api/places` returns candidates ranked by name match, then population:

```bash
curl 'https://js-astro-api.js-astro.workers.dev/api/places?q=san+jose'
```

```json
{
  "query": "san jose",
  "count": 3,
  "results": [
    { "name": "San Jose", "country": "US", "latitude": 37.3394,
      "longitude": -121.895, "timeZone": "America/Los_Angeles", "population": 1026908 },
    { "name": "San José", "country": "CR", "latitude": 9.9333,
      "longitude": -84.0833, "timeZone": "America/Costa_Rica", "population": 335007 },
    { "name": "San Jose", "country": "PH", "latitude": 15.7903,
      "longitude": 120.9911, "timeZone": "Asia/Manila", "population": 35631 }
  ]
}
```

Pick the country you meant, then call the chart with that exact `city` + `country`:

```bash
curl 'https://js-astro-api.js-astro.workers.dev/api/chart?year=1990&month=1&day=1&hour=12&minute=0&city=San+Jose&country=CR&tz=America/Costa_Rica'
```

(For the case above, `country=US` for the Californian city, `CR` for the Costa
Rican one, `PH` for the Philippine one.)

### 2.8 House systems

`system=1` through `7`:

| id | Name |
|---|---|
| 1 | Placidus (default) |
| 2 | Campanus |
| 3 | Regiomontanus |
| 4 | Koch |
| 5 | Topocentric |
| 6 | Axial |
| 7 | Morinus |

### 2.9 The 364-part zodiac via API

`GET /api/zodiac` — same input parameters as `/api/chart`. It returns the same
positions but expressed in a **364-part circle = 13 signs × 28**, anchored at the
**real winter solstice** (Sun at 0° Capricorn), found by bisection of the Sun’s
longitude for that year. This is the **Ultracopernican revolution**: a credible
alternative, not a replacement — the traditional 12 signs keep all their meaning.

A planet looks like:

```json
{
  "sign": "Cancer",
  "abbr": "Cn",
  "part": 1.836,
  "degree": 1,
  "minute": 50,
  "second": 12,
  "formatted": "Cancer 1(+28) 50'12\"",
  "coordinate": 169.836
}
```

- `coordinate` = position in parts since the solstice (0–364).
- `formatted` = sign + part-of-28 (+28 shows the sign is divided in 28) + minutes/seconds.
- `degree`/`minute`/`second` are the rounded breakdown.

Plus the **zodiac time**, a pure position of the Sun-cycle since the solstice:

```json
{
  "zodiacTime": {
    "solsticeStart": 2436925.106, "solsticeEnd": 2437290.349,
    "zodiacYearLengthDays": 365.2427,
    "zodiacDay": 1.003414,
    "dayNumber": 168.624,
    "day": 168,
    "sign": "Cancer",
    "signAbbr": "Cn",
    "dayInSign": 0,
    "hour": 14, "minute": 58, "second": 23,
    "formatted": "Cancer 00 14:58:23"
  }
}
```

- `zodiacYearLengthDays` ≈ 365.2427 — one real solstice-to-solstice year.
- `zodiacDay` = year / 364 ≈ 1.003414 conventional days (**geometry rules, time adapts**: the *second* is a scalable convention, the sky never bends to the calendar).
- `formatted` reads like a clock: `Cancer 00 14:58:23` = 14h58m23s after `Cancer 00` (the 169th day = the winter solstice plus 168 zodiacal days).

The 364 zodiac may run a fraction of a day ahead of or behind the civil calendar
(the *equation of time*): that divergence is expected, real astronomy — “two
honest meters”, the calendar and the Sun each measured honestly.

### 2.10 Errors

Invalid requests return **HTTP 400** with a `{ "error": ..., "hint": ... }` body:

```json
{ "error": "Missing parameter: day", "hint": "year=&month=&day=&hour=&minute=" }
{ "error": "Provide lon+lat (decimal or DMS) or city (country optional)" }
{ "error": "Invalid lon/lat (use decimal degrees or DMS, e.g. 45°15'30\"N)" }
```

### 2.11 Running the server locally

```bash
timeout 8 node server.js      # starts on port 3000
curl 'http://localhost:3000/api/planets?year=1960&month=6&day=8&hour=20&minute=20&city=Mestre&country=IT'
```

The local server exposes exactly the same endpoints (`/app` included). The README
documents the underlying JavaScript library (`calPlanetPosition2`, `calHouseCusp2`)
for in-browser/in-process computation without any HTTP call.

### 2.12 Verify with the reference chart

The whole project is validated against this chart (Isola della Scala, Italy,
08/06/1960 20:20 local):

```bash
curl 'https://js-astro-api.js-astro.workers.dev/api/chart?year=1960&month=6&day=8&hour=20&minute=20&city=Isola+della+Scala&country=IT'
```

Expected, live-verified values:

| Item | Expected |
|---|---|
| Sun | Gemini 17°58'13" |
| Moon | Sagittarius 7°27'02" |
| ASC (house 1, Placidus) | Sagittarius 23°04'42" |
| 364 Sun | Cancer 1(+28) 50'12" |
| Zodiac time | Cancer 00 14:58:23 |
| Zodiac year length | ≈ 365.2427 days |

---

*Engine: js_astro by Yoshihiro Sakai (English fork). Place data: GeoNames,
CC BY 4.0. Ultracopernican 364 zodiac: original work of this project.*