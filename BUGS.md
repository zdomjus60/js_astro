# Bugs found & fixed (English translation fork)

Reported for upstream: [astsakai/js_astro](https://github.com/astsakai/js_astro)

## Root cause

All files rely on **implicit global variables** (assignments without `var`/`let`/`const`).
This works in classic browser scripts (non-strict mode) but **throws ReferenceError in strict mode**
(ES modules, Cloudflare Workers, bundlers, `"use strict"`).

## Affected locations (original code)

| File | Line (orig) | Variable | Issue |
|------|-------------|----------|-------|
| `src/math.js` | 9 | `deg2rad` | `deg2rad = Math.PI / 180.0;` — no declaration. Breaks any module-loading environment. |
| `src/cuspcal.js` | `calHousePlacidus` | `nh` | `nh = i;` — no declaration. |
| `src/cuspcal.js` | `calHouseAxial` | `i`, `house` | `for(i = 10;...)`, `house = ...` — no declarations. |
| `src/cuspcal.js` | `calHouseMorinus` | `i` | `for(i = 1;...)` — no declaration. |
| `src/pluto.js` | `calPositPL_bdl` | `i`, `m`, `iv`, `imax`, `imin`, `f`, `cf`, `sf` | Loop counters and temporaries assigned without declarations. |

## Fix applied

- `src/math.js`: `deg2rad = ...` → `var deg2rad = ...`
- `src/cuspcal.js`: added `nh` to the existing `var` list in `calHousePlacidus`;
  added `i, house` to the `var` list in `calHouseAxial`;
  added `i` to the `var` list in `calHouseMorinus`.
- `src/pluto.js`: added `var i, m, iv, imax, imin, f, cf, sf;` in `calPositPL_bdl`.

## Suggested upstream fix

Declare the missing variables with `var` (same as above), or wrap the library in a
`(function() { "use strict"; ... }).call(this)` / module IIFE so implicit globals cannot leak.

Verified with `node --input-type=module` (strict ESM): all 7 house systems, planetary
positions, minor planets and Pluto computations now run without errors.