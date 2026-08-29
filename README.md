# js_astro
Sample code for astrological calculation written by JavaScript.

> **Try it online** — the calculator is live at
> **https://js-astro-api.js-astro.workers.dev/app** (readable interface, no
> technical knowledge needed: pick date/time, search your city, get the chart
> and the [Ultracopernican 364 zodiac](https://github.com/anomalyco/js_astro) in plain text).
> API documentation and endpoints: <https://js-astro-api.js-astro.workers.dev/>.
>
> **New — full usage guide:** see **[GUIDE.md](GUIDE.md)** for a step-by-step
> walkthrough of the web calculator and ready-to-run API examples in Python,
> JavaScript and curl.

This library intent to:

* calculation of major planetary position(geocentric, apparent longitude) for 0-4000 A.D. within 1 arcminute.
* calculation of house cusp longitudes

## Requirement
### Environment
Newest Browser.

### Library
Some functions requires [spirntf.js](https://github.com/alexei/sprintf.js), but if you don't want to use function `cnv2*`, not required.

## Credits
This is a fork of [js_astro](https://github.com/astsakai/js_astro) by **Yoshihiro Sakai & Sakai Institute of Astrology**.

Original library is written in Japanese (Shift-JIS encoding) with hardcoded Japan Standard Time (UTC+0900) timezone.

This fork makes the following changes:
- Translated all comments from Japanese to English
- Converted source files from Shift-JIS to UTF-8 encoding
- Removed hardcoded Japan time offset (UTC+0900) from `calJD()` function — the library now accepts local time directly
- Translated Japanese prefecture names to English in `geodata.js`

## License
Files in this repository are released under MIT license.

## Usage
### Calculate for planetary position
Include all libraries, and call `calPlanetPositon2` as:

```
var planetPosition = new Array();
planetPosition = calPlanetPosition2( year, month, day, hour, minute, longitude, latitude );
```

`calPlanetPosition2` returns array of 20 values:

* Julian day
* Planetary Position(Geocentric apparent ecliptic longitude): Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
* Lunar Node & apogee Longitude(from approximate osculate orbital elements)
* Longitude of Ascendant, MC(Mid heaven)
	* All value is expressed in degree, without Julian day.
* Position of minor planets(Geocentric apparent ecliptic longitude): Ceres, Pallas, Juno, Vesta, Chiron

### Calculate for house cusp longitudes

Include all libraries, and call `calHouseCusp2` as:

```
var cuspLongitudes = new Array();
cuspLongitudes = calHouseCusp2( year, month, day, hour, minute, longitude, latitude, 1 );
```

Last Argument `1` means Placidus house system.

`calHouseCusp2` returns array of house cusp longitude(Index of this array starts **1**, **not 0**).

### Important notice
In this library, definition of major planets and minor planets is modern astrological, not currently astronomical.
I assume Pluto as major planet and Ceres as minor planet, which they are dwarf planets in currently astronomy.

**Positions of minor planets can calculate between December 30, 1924 12:00 TT and December 31, 2124 12:00 TT only.**

Timezone: This library accepts local time. The caller is responsible for providing the correct local time for the given longitude.
I never consider any Daylight Saving Time in past and future.

This library assumes **eastern geographical longitude and northern geographical latitude as plus**(eg. Tokyo: 139E42 = +139.70, 35N41 = +35.68).

## Ultracopernican revolution (364-part zodiac)

`src/zodiac.js` adds an alternative zodiac & time cycle. It is a **credible alternative, not a replacement**: the traditional 12-sign zodiac keeps all its glory, history and meaning. This module simply asks "what if the zodiac were built from the sky itself, with no calendar leftover?"

The idea, in the spirit of Copernicus (geometry over convention):

- The circle is divided into **364 equal parts** = **13 signs x 28** (the tradition's 12 signs + **Ophiuchus**, the astronomer's sign the tradition chose to leave out between Scorpio and Sagittarius).
- Coordinate `z = 0` is anchored to the **real winter solstice** (Sun at 0° Capricorn). Solstices are found by bisection on the Sun's ecliptic longitude, so the origin is astronomically real, a cardinal point of the sky itself.
- The zodiac year runs from one real winter solstice to the next (**≈ 365.2427 days**).
- **1 zodiac day = year / 364** (≈ 1.003414 conventional days). Hours, minutes and seconds scale from the zodiac day: the *second* becomes a variable convention adapting to the real geometry. The sky is never bent to fit the calendar.
- A zodiac time is expressed as a pure position: e.g. `Cancer 00 14:58:23` means the Sun-cycle has reached 14h58m23s after the start of Cancer 00 = 0° (the solstice).

Reversible conversions `lon ↔ z` and the full description helpers live in `src/zodiac.js` (uses `calPlaPos`/`correctTDT`/`calJDz`/`cnvCalendar`).

REST endpoint: `GET /api/zodiac?year&month&day&hour&minute&lon&lat` returns planetary positions and points as 364-coordinates plus `zodiacTime`. Available both in the Express server and the Cloudflare Worker.

Astrology stays astrology here: the same signs, the same sky, the same Earth-bound point of view — only the ruler is the real solstice instead of the civil calendar.

## REST API (server.js and Cloudflare Worker)

Run locally with `timeout 8 node server.js` (port 3000). The Cloudflare Worker is deployed as `js-astro-api`.

### Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/planets` | Planetary positions and points |
| `GET /api/houses` | House cusps (`system=1-7`) |
| `GET /api/chart` | Planets + houses in one call |
| `GET /api/zodiac` | 364-part zodiac + `zodiacTime` (Ultracopernican) |
| `GET /api/places` | Search a place by name (disambiguates homonyms) |

### Parameters

- `year`, `month`, `day`, `hour`, `minute` — the local civil time of the birthplace calendar date.
- Location, either:
  - `lon` + `lat` in **decimal degrees** (`11`, `45.19`) **or degrees-minutes-seconds** (`11°00'00"E`, `45°15'30"N`, `45 15 30`, `45:15:30`), with optional hemisphere letters `N/S/E/W` and signs; or
  - `city` (name) + optional `country` (ISO-3166 alpha-2, e.g. `IT`) — the API resolves coordinates and IANA time zone automatically from the GeoNames index.
- Optional `tz` — IANA (OLSON) zone (e.g. `Europe/Rome`, `Asia/Tokyo`). When present, `hour/minute` are treated as local civil time and converted to UTC automatically (historical DST included). Without `tz` the entered time is treated as UTC already.
- Optional `system` — house system 1-7: Placidus, Campanus, Regiomontanus, Koch, Topocentric, Axial, Morinus.

### Place search (homonym disambiguation)

`GET /api/places?q=roma&country=IT` returns candidate matches ranked by name score then population,
each with `name`, `country`, `latitude`, `longitude`, `timeZone`, `population` — pick the right one and
pass it back as `city=...&country=...` (example: `san jose` exists in US, CR and PH).

### Test cases

```
# Reference chart (Isola della Scala, 08/06/1960, 20:20 local):
#   local time + tz          -> UTC 19:20
GET /api/chart?year=1960&month=6&day=8&hour=20&minute=20&city=Isola+della+Scala&country=IT
# equivalently with coordinates and tz
GET /api/chart?year=1960&month=6&day=8&hour=20&minute=20&lon=11&lat=45.19&tz=Europe/Rome
# coordinates as DMS
GET /api/chart?year=1960&month=6&day=8&hour=20&minute=20&lon=11%C2%B000%2700%22E&lat=45%C2%B015%2730%22N&tz=Europe/Rome
# the same instant from Asia/Tokyo (local: 1960-06-09 04:20)
GET /api/chart?year=1960&month=6&day=9&hour=4&minute=20&lon=139.69&lat=35.69&tz=Asia/Tokyo
```

Expected for the reference chart: Sun Gemini 17°58'13" (ASC Sagittarius 23°08'14", Moon Sagittarius 7°27'02");
364-coordinate Sun = Cancer 1(+28) 50'12", zodiac time `Cancer 00 14:58:23`.

Place data: derived from [GeoNames](https://www.geonames.org/) (`cities1000` + `IT` exports, filtered to
world population ≥ 5000 plus Italian places ≥ 1500 ≈ 72k cities), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Regenerate with `node build-places.js`.
Coordinates internal to the engine are expressed in **degrees-minutes-seconds systems interchangeably**:
the API accepts both DMS (`45°15'30"N`) and pure degree fractions (`45.2583`).

## Demonstration

To test the original library, try [this](http://astsakai.halfmoon.jp/fortune/platest_js.html) (Japanese).

In the spirit of this fork — the **Ultracopernican revolution**, where the sky
stays whole and the calendar adapts — the demonstration we propose is the live
calculator:

> **https://js-astro-api.js-astro.workers.dev/app**

No setup, no demo page to host: open it, pick a date and place, and the chart
is computed on the fly by the deployed worker — geometry first, the clock bends
to the real sky, never the other way around. The [API endpoints](https://js-astro-api.js-astro.workers.dev/)
serve the same engine for developers.

## Errata for Leaflet written in Japanese
This library has a leaflet, and this leaflet has some error. Errata is [here](https://github.com/astsakai/js_astro/wiki/support).

