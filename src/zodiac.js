/*
 * zodiacead - 364-part zodiac (revolution ultracopernicanus)
 * A CREDIBLE ALTERNATIVE to, not a replacement of, the traditional
 * 12-sign zodiac. It keeps the old signs and symbols (13th is Ophiuchus,
 * the astronomer's sign the tradition chose to leave out) and stays true
 * to astrology's own roots: the ecliptic, the solstices, the sky as seen
 * from Earth.
 * Astronomical anchor: the circle is divided into 364 equal parts
 * (13 signs x 28 each). Origin (coordinate 0) is the winter solstice:
 * Sun at 0 Capricorn (ecliptic 270).
 * The "day" is 1/364 of the real tropical year (solstice to solstice);
 * hours/minutes/seconds scale down from it. The residual ~1.25 days is
 * absorbed in the scale factor - geometry rules, time adapts, the sky
 * is never bent to fit the calendar.
 * Copyright (c) 2026, extension of js_astro by Yoshihiro Sakai
 */

var ZODIAC364 = [
	"Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini",
	"Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Ophiuchus", "Sagittarius"
];

var ZODIAC364_ABBR = ["Ca", "Aq", "Pi", "Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Op", "Sg"];

// Winter solstice in ecliptic longitude (traditional solar position)
var SOLSTICE_LON = 270.0;

// 13 signs x 28 = 364 parts
var ZODIAC364_PARTS = 364;
var ZODIAC364_SIGNS = 13;
var ZODIAC364_PER_SIGN = 28;

// Short wrappers used in this file
var fmod364 = function(x) { return ((x % 364) + 364) % 364; };

// Convert ecliptic longitude (0-360) to 364-part coordinate.
// z = 0 at winter solstice; + z is direct (counterclockwise).
function lonToZodiac364( lonEcl ){
	var z = (lonEcl - SOLSTICE_LON) * ZODIAC364_PARTS / 360.0;
	return fmod364( z );
}

// Reverse: 364-part coordinate back to ecliptic longitude.
function zodiac364ToLon( z ){
	return SOLSTICE_LON + fmod364( z ) * 360.0 / ZODIAC364_PARTS;
}

// Split a 364-coordinate into { sign index (0-12), part within sign, formatted }.
function zodiac364Split( z ){
	var zz = fmod364( z );
	var sign = Math.floor( zz / ZODIAC364_PER_SIGN );
	var part = zz - sign * ZODIAC364_PER_SIGN;
	var pi   = Math.floor( part );
	var fr   = part - pi;
	var mi   = Math.floor( fr * 60.0 );
	var se   = Math.floor( (fr * 60.0 - mi) * 60.0 );
	return {
		sign: ZODIAC364[ sign ],
		abbr: ZODIAC364_ABBR[ sign ],
		part: part,
		degree: pi,
		minute: mi,
		second: se,
		formatted: ZODIAC364[ sign ] + " " + pi + "(+28) " + String(mi).padStart(2,"0") + "'" + String(se).padStart(2,"0") + '"'
	};
}

// Full description of an ecliptic longitude in the 364 zodiac.
function describeZodiac364( lonEcl ){
	var z = lonToZodiac364( lonEcl );
	var d = zodiac364Split( z );
	d.coordinate = z;
	return d;
}

// ---- time scale ----

// Find the exact moment (JD) when the Sun reaches a given ecliptic longitude,
// near the given guess JD. Bounded binary search.
function findSunLon( targetLon, guessJD ){
	var lo = guessJD - 20.0;
	var hi = guessJD + 20.0;
	var f = function(jd){
		return calPlaPos( jd + correctTDT( jd ), 1 );
	};
	for( var i = 0; i < 60; i++ ){
		var mid = (lo + hi) / 2.0;
		var cur = f( mid );
		var dcur = cur - targetLon;
		// unwrap across 0/360
		if( dcur >  180.0 ) dcur -= 360.0;
		if( dcur < -180.0 ) dcur += 360.0;
		if( dcur > 0 ){
			hi = mid;
		} else {
			lo = mid;
		}
	}
	return (lo + hi) / 2.0;
}

// Approximate JD of the December winter solstice of calendar year y.
function solsticeGuessJD( y ){
	return calJDz( y, 12, 21 ) + 0.4; // solstice typically Dec 20-22
}

// Winter solstice JD for the year whose calendar year is y.
function winterSolsticeJD( y ){
	return findSunLon( SOLSTICE_LON, solsticeGuessJD( y ) );
}

// The tropical year "of" a JD: from the last winter solstice to the next one.
// Returns { jdStart, jdEnd, year, dayLength } where dayLength = (jdEnd-jdStart)/364 in JD units.
function tropicalYearAt( jd ){
	// crude calendar year for search
	var date = cnvCalendar( jd );
	var y = date[ 0 ];
	var jd1 = winterSolsticeJD( y );
	var jd2 = winterSolsticeJD( y + 1 );
	if( jd < jd1 ){           // still before this year's winter solstice?
		jd1 = winterSolsticeJD( y - 1 );
		jd2 = winterSolsticeJD( y     );
		y   = y - 1;
	}
	var len = jd2 - jd1;
	return { jdStart: jd1, jdEnd: jd2, year: y, dayLength: len / ZODIAC364_PARTS };
}

// Convert a JD to the 364-part zodiac time.
// y starts at 1 for the first year of the era (every era begins at a solstice).
function jdToZodiacTime( jd ){
	var ty = tropicalYearAt( jd );
	var elapsedDays = ( jd - ty.jdStart ) / ty.dayLength;  // 0..364

	// months: 13 x 28 = 364
	var day0   = Math.floor( elapsedDays );
	var sign   = Math.floor( day0 / ZODIAC364_PER_SIGN );
	var dayIn  = day0 % ZODIAC364_PER_SIGN;
	var frac   = elapsedDays - day0;
	// sub-day units scaled from the zodiacal day
	var hour   = Math.floor( frac * 24.0 );
	var minute = Math.floor( (frac * 24.0 - hour) * 60.0 );
	var second = Math.floor( ((frac * 24.0 - hour) * 60.0 - minute) * 60.0 );
	return {
		jd: jd,
		solsticeStart: ty.jdStart,
		solsticeEnd: ty.jdEnd,
		zodiacYearLengthDays: ty.dayLength * ZODIAC364_PARTS, // ~365.2422 conventional days
		zodiacDay: ty.dayLength,                             // ~1.0034 conventional days
		dayNumber: elapsedDays,                              // continuous 0..364
		day: day0,
		sign: ZODIAC364[ sign ],
		signAbbr: ZODIAC364_ABBR[ sign ],
		dayInSign: dayIn,
		hour: hour,
		minute: minute,
		second: second,
		formatted: ZODIAC364[ sign ] + " " + String(dayIn).padStart(2,"0") + " " + String(hour).padStart(2,"0") + ":" + String(minute).padStart(2,"0") + ":" + String(second).padStart(2,"0")
	};
}