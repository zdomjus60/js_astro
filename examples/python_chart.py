#!/usr/bin/env python3
"""Readable astrological chart from the js_astro API.

Runs on standard Python 3 only (no third-party packages). Prints a readable
chart for a date/time and a place — either a city name or coordinates.

Quick start:
    python3 python_chart.py --date 1960-06-08 --time 20:20 --city "Isola della Scala" --country IT
    python3 python_chart.py --date 1960-06-08 --time 20:20 --city Padova --country IT --zodiac
    python3 python_chart.py --date 1960-06-08 --time 20:20 --lon 11 --lat 45.19 --tz Europe/Rome

Options:
    --date YYYY-MM-DD      local date (required)
    --time HH:MM           local time (required)
    --city NAME            a city (searchable by its usual names, e.g. Venezia, Tokyo, 東京)
    --country CC           ISO-3166 alpha-2 to disambiguate homonyms (e.g. IT, US, CR)
    --lon D                longitude: decimal degrees or DMS (45°15'30"N)
    --lat D                latitude: decimal degrees or DMS
    --tz ZONE              IANA time zone (Europe/Rome, Asia/Tokyo); optional only
                           with --city, required with --lon/--lat unless UTC
    --system N             1=Placidus 2=Campanus 3=Regiomontanus 4=Koch
                           5=Topocentric 6=Axial 7=Morinus (default 1)
    --zodiac               also print the Ultracopernican 364-part zodiac
    --base URL             API base URL (default: the live Cloudflare worker)
    --raw                  print the raw JSON instead of the readable summary
"""

import argparse
import json
import sys
from urllib.parse import urlencode
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

DEFAULT_BASE = "https://js-astro-api.js-astro.workers.dev"
PLANET_NAMES = ["sun", "moon", "mercury", "venus", "mars", "jupiter",
                "saturn", "uranus", "neptune", "pluto"]
POINT_NAMES = {"node": "Moon's Node", "apogee": "Lunar Apogee",
               "asc": "Ascendant", "mc": "Midheaven"}
MINOR_NAMES = ["ceres", "pallas", "juno", "vesta", "chiron"]


def api(base, path, **params):
    url = base + path + "?" + urlencode(params)
    try:
        with urlopen(Request(url, headers={"User-Agent": "python-chart"}),
                     timeout=20) as resp:
            return json.load(resp)
    except HTTPError as e:
        if e.code == 429:
            sys.exit("Rate limited (429): you asked > 100 times in one hour. "
                     "Wait a little and retry.")
        body = e.read().decode("utf-8", "replace")
        sys.exit(f"HTTP {e.code} from the API:\n{body}")
    except URLError as e:
        sys.exit(f"Cannot reach the API: {e.reason}")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--date", help="YYYY-MM-DD (required)")
    p.add_argument("--time", help="HH:MM (required)")
    p.add_argument("--city", help="city name")
    p.add_argument("--country", help="ISO-3166 alpha-2 country code")
    p.add_argument("--lon", help="longitude (decimal degrees or DMS)")
    p.add_argument("--lat", help="latitude (decimal degrees or DMS)")
    p.add_argument("--tz", help="IANA time zone name")
    p.add_argument("--system", default="1", help="house system 1-7 (default 1)")
    p.add_argument("--zodiac", action="store_true",
                   help="also print the 364-part zodiac")
    p.add_argument("--base", default=DEFAULT_BASE, help="API base URL")
    p.add_argument("--raw", action="store_true", help="print raw JSON")
    args = p.parse_args()

    if not args.date or not args.time:
        p.error("--date and --time are required (e.g. --date 1960-06-08 --time 20:20)")

    y, mo, d = args.date.split("-")
    h, mi = args.time.split(":")
    params = {"year": y, "month": mo, "day": d, "hour": h, "minute": mi,
              "system": args.system}
    if args.city:
        params["city"] = args.city
        if args.country:
            params["country"] = args.country
    elif args.lon and args.lat:
        params["lon"] = args.lon
        params["lat"] = args.lat
        if args.tz:
            params["tz"] = args.tz
    else:
        p.error("give a place: --city [--country] or --lon --lat [--tz]")

    if args.zodiac:
        data = api(args.base, "/api/zodiac", **params)
    else:
        data = api(args.base, "/api/chart", **params)

    if args.raw:
        print(json.dumps(data, indent=2))
        return

    place = data.get("resolved", {})
    print("\njs_astro chart")
    print("  when:", data.get("date"), data.get("time"),
          "(local) -> UTC", data.get("utcDate"), data.get("utcTime"),
          data.get("timeZone") or "(UTC)")
    if place:
        print("  where:", place.get("name"), "(" + place.get("country", ""), ")",
              "pop", place.get("population", "-"))
    else:
        loc = data.get("location", {})
        print("  where: %s E, %s N" % (loc.get("longitude"), loc.get("latitude")))

    for key in PLANET_NAMES:
        if key in data.get("planets", {}):
            print("  %-9s %s" % (key.title(), data["planets"][key]["formatted"]))
    for key, label in POINT_NAMES.items():
        if key in data.get("points", {}):
            print("  %-9s %s" % (label, data["points"][key]["formatted"]))
    for key in MINOR_NAMES:
        if key in data.get("minorPlanets", {}):
            print("  %-9s %s" % (key.title(), data["minorPlanets"][key]["formatted"]))

    if args.zodiac:
        t = data.get("zodiacTime", {})
        sun = data.get("planets", {}).get("sun", {})
        print("  --- Ultracopernican 364 zodiac (13 signs x 28) ---")
        print("  Sun 364:", sun.get("formatted", "-"),
              "| solar year: %.4f days" % t.get("zodiacYearLengthDays", 0))
        print("  zodiac time:", t.get("formatted", "-"))
    elif "houses" in data:
        hs = data.get("houseSystem", {})
        print("  --- houses", (hs.get("name") or ""), "---")
        for i in range(1, 13):
            h = data["houses"].get("house%d" % i)
            if h:
                print("  house %2d %s" % (i, h["formatted"]))


if __name__ == "__main__":
    main()