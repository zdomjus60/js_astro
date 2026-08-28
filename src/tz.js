/*
 * iantime - IANA (OLSON) time-zone helpers for the js_astro API layer
 *
 * Converts a local civil date/time (the clock reading at the birthplace)
 * into the corresponding UTC instant using the IANA Time Zone Database
 * (OLSON/tzdata). Modern runtimes ship that data embedded in the ECMA-402
 * `Intl` object, including historical daylight-saving rules (e.g. Italy
 * used no DST before 1966: Europe/Rome stays UTC+1 in June 1960), so no
 * calendar or summer-time hacks are needed.
 *
 * References
 * - IANA Time Zone Database: https://www.iana.org/time-zones
 * - tz source tree: https://github.com/eggert/tz
 *
 * The astronomical engine itself never sees a time zone: it always works
 * in UTC. The conversion is boundary-only, applied by the REST/API layer.
 *
 * Copyright (c) 2026, extension of js_astro by Yoshihiro Sakai
 * @license MIT
 */

// Milliseconds of a UTC wall-clock reading, built with setUTCFullYear so
// that years 0-99 (and year 0 itself) are handled correctly (Date.UTC would
// map 0-99 onto 1900-1999). setUTCFullYear only sets year/month/day and
// preserves the time of day, so the clock parts are set explicitly after.
function utcWallMs(y, m, d, h, mi, s) {
	var dt = new Date(0);
	dt.setUTCFullYear(y, m - 1, d);
	dt.setUTCHours(h === undefined ? 0 : h, mi === undefined ? 0 : mi, s === undefined ? 0 : s, 0);
	return dt.getTime();
}

// Wall-clock reading (yyyy-mm-dd hh:mm:ss) of instant `ms` on the given
// zone, returned as the UTC-milliseconds that would print that reading.
function zoneWallMs(ms, tz) {
	var fmt = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	var parts = fmt.formatToParts(new Date(ms));
	var o = {};
	for (var i = 0; i < parts.length; i++) {
		var t = parts[i].type;
		if (t !== 'literal') o[t] = parseInt(parts[i].value, 10);
	}
	return utcWallMs(o.year, o.month, o.day, o.hour, o.minute, o.second);
}

// Minutes the given zone is ahead of UTC at instant `ms` (+ = east of
// Greenwich, e.g. +60 for Europe/Rome in June 1960, -300 for New York).
function tzOffsetMinutes(ms, tz) {
	var off = zoneWallMs(ms, tz) - ms;
	var half = 43200000;
	while (off > half) off -= 86400000;
	while (off < -half) off += 86400000;
	return off / 60000;
}

// Whether `tz` is a zone name the current runtime knows (IANA/OLSON).
// Runtimes without the tz database embedded (some edge workers) return
// false, so callers can fail with a clear message.
function isValidIANAZone(tz) {
	if (typeof tz !== 'string' || tz === '') return false;
	try {
		var fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz });
		fmt.format(new Date(0));
		return true;
	} catch (e) {
		return false;
	}
}

// Local civil (wall-clock at the birthplace) -> UTC instant.
// Returns { year, month, day, hour, minute, offsetMinutes } where
// offsetMinutes is the zone's UTC offset at that moment (+ = east).
// Converges by fixed-point iteration; stable within a couple of passes
// even across DST boundaries.
function localCivilToUtc(y, m, d, h, mi, tz) {
	var local = utcWallMs(y, m, d, h, mi, 0);
	var guess = local;
	for (var i = 0; i < 5; i++) {
		var next = local - tzOffsetMinutes(guess, tz) * 60000;
		if (next === guess) break;
		guess = next;
	}
	var dt = new Date(guess);
	return {
		year: dt.getUTCFullYear(),
		month: dt.getUTCMonth() + 1,
		day: dt.getUTCDate(),
		hour: dt.getUTCHours(),
		minute: dt.getUTCMinutes(),
		offsetMinutes: Math.round((local - guess) / 60000)
	};
}