**Title:** `Portability note: implicit global variables in strict mode`

**Body:**

```
Hi Mr. Sakai,

Thank you for this excellent library — the accuracy is impressive and it's
been a pleasure to work with. I'd like to share a small portability
observation, in case it's useful.

When using the library outside a classic script tag (ES modules, bundlers,
Cloudflare Workers), a few assignments stop the code with a ReferenceError,
because strict mode requires variables to be declared. Implicit globals
happen to work in non-strict mode, but not in strict mode.

Here is what I found, with suggestions for the minimal fix (before → after):

1. src/math.js, line 9
   Before:
       deg2rad = Math.PI / 180.0;
   After:
       var deg2rad = Math.PI / 180.0;

2. src/cuspcal.js — calHousePlacidus(): `nh` is never declared
   Before:
       var d    = 0.0;
       var csp  = 0.0;
       ...
       nh = i;
   After:
       var nh   = 0.0;        // added to the declarations
       ...
       nh = i;

3. src/cuspcal.js — calHouseAxial(): `i` and `house` are never declared
   Before:
       var alpha, cspx, cspy;
       ...
       for(i = 10; i < 16; i++){
           house = ...;
   After:
       var alpha, cspx, cspy, i, house;

4. src/cuspcal.js — calHouseMorinus(): `i` is never declared
   Before:
       var Z, cspx, cspy;
       ...
       for(i = 1; i <= 12; i++){
   After:
       var Z, cspx, cspy, i;

5. src/pluto.js — calPositPL_bdl(): several variables are never declared
   Before:
       var v = new Array(...), E = new Array(), nf = new Array(...);
       ...
       for(i = 3; i >= 0; i--){ ... }
       for(m = 0; ...) { for(iv = 1; ...) { ... imin = ...; f = ...; cf = ...; sf = ...; } }
   After:
       var v = new Array(...), E = new Array(), nf = new Array(...);
       var i, m, iv, imax, imin, f, cf, sf;   // added

All cases are just missing declarations — no logic is changed. After these
edits I verified every calculation (planetary positions, all seven house
systems, and Pluto) runs without errors under strict ESM.

Everything else works beautifully. Happy to send a patch if that's helpful.
```