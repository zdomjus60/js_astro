/*
 * Astrology calculation engine "Metako" version 0.20j at 2017/04/30, 2017/05/05
 * Copyright (c) 1999-2001, 2003, 2004, 2017 Yoshihiro Sakai & Sakai Institute of Astrology
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

var planame = ["",
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
	"Node", "Lilith", "Ascendant", "MC",
	"Ceres", "Pallas", "Juno", "Vesta", "Chiron",
	"Cupid", "Hades", "Zeus", "Chronos",
	"Apollo", "Admetos", "Vulcanus", "Poseidon"];
var planame6 = ["",
    "Sun   ", "Moon  ", "Mercury", "Venus ", "Mars  ",
    "Jupiter", "Saturn ", "Uranus ", "Neptune", "Pluto  ",
	"Node  ", "Lilith ", "Asc    ", "MC     ",
	"Ceres ", "Pallas ", "Juno   ", "Vesta  ", "Chiron ",
	"Cupid ", "Hades  ", "Zeus   ", "Chron  ",
	"Apollo", "Admeto", "Vulcan ", "Poseid"];
var sgnname = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
var sgnS = ["Ar", "Ta", "Ge", "Ca", "Le", "Vi", "Li", "Sc", "Sa", "Cp", "Aq", "Pi"];

function convertPlanetHouse( pla, csp ){
	var hse = new Array();
	for(var i = 1; i < 14; i++ ){
		hse[i] = convertPlanetHouse0( pla[i], csp );
	}

	return hse;
}

function CnvPlanetHouse0( pos, csp){
	var cusp0 = 0.0;
	var cusp1 = 0.0;
	var ang0 = 0.0;
	var ang1 = 0.0;
	var hse;

	for(j = 1;j <= 12;j++){
		cusp0 = csp[j];
		cusp1 = csp[j % 12 + 1];
		ang0  = angle1(pos,   cusp0);
		ang1  = angle1(cusp1, cusp0);
		if((0 <= ang0) && (ang0 < ang1)) hse = j;
	}

	return hse;
}

// ----------------------------------

//Angular distance calculation (aspect type)
function angle(obj1, obj2){
    var dist = obj2 - obj1;
    var ang  = acos4deg(cos4deg(dist));

	return ang;
}

function angle1(obj, csp){
	var ang = obj - csp;
	if(ang >  180.0){
		ang += -360.0;
	}
	if(ang < -180.0){
		ang += +360.0;
	}

	return ang;
}

// Angle difference to aspect conversion
function checkAspect(ang, deforb){
	var asp = checkAspectStrictly(ang, deforb, 0.0);
	var asptype = asp[ 0 ];
	var orb     = asp[ 1 ];

	var type = -1;
	if(asptype ==  0) type =  0;
	if(asptype ==  4) type =  1;
	if(asptype ==  6) type =  2;
	if(asptype ==  7) type =  1;
	if(asptype == 11) type =  2;

	var result = [type, orb];
	return result;
}

function checkAspectStrictly(asp, orb1, orb2){
	var asp0, orb0, diff;
	var aspTable = [0, 30, 36, 45, 60, 72, 90, 120, 135, 144, 150, 180];
	var orbTable = [1, 2, 2, 2, 1, 2, 1, 1, 2, 2, 2, 1];
	var res = -1;

	for(var i = 0;i < 12;i++){
		asp0 = aspTable[i];
		orb0 = ((orbTable[i] == 1) ? orb1 : orb2);
		if(asp0 - orb0 <= asp && asp <= asp0 + orb0){
			res = i;
			diff = asp - asp0;
			break;
		}
	}

	var result = [res, diff];
	return result;
}

// Forward or backward?
function ChkPos(to, from){
	var diff = to - from;
	if(diff >= +180.0) diff -= 360.0;
	if(diff <= -180.0) diff += 360.0;

	return diff;
}

// In retrograde?
function checkRetrograde(ye, mo, da, ho, mi){
	var pos0 = calPlanetPosition(ye, mo, da, ho, mi - 1, 48);
	var pos1 = calPlanetPosition(ye, mo, da, ho, mi + 1, 48);
	var ret  = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
	var vel  = 0.0;

	for( var i = 1; i <= 10; i++ ){
		vel = (pos1[i] - pos[i]) * 720.0;
		if(vel < 0.0) ret[i] = -1;
	}

	return ret;
}

// Absolute degree to sign conversion
function cnvSign( adeg ){
	adeg = mod360(adeg);
	var sgn = Math.floor(adeg / 30.0);

	return sgn;
}

// Absolute degree to sign string conversion
function cnv2kanji( adeg ){
	adeg = mod360(adeg);
	var sgn = Math.floor(adeg / 30.0);
	var deg = sprintf("%2d", Math.floor(adeg - sgn * 30.0));
	var min = sprintf("%02d", Math.floor((adeg - (sgn * 30 + deg)) * 60.0));
	return sprintf( "%s%2d°%02d'", sgnname[ sgn ], deg, min );
}

// Absolute degree to sign string conversion
function cnv2knj( adeg ){
		adeg = mod360(adeg);
		var sgn = Math.floor(adeg / 30.0);
		var deg = sprintf("%2d", Math.floor(adeg - sgn * 30.0));
		var min = sprintf("%02d", Math.floor((adeg - (sgn * 30 + deg)) * 60.0));
		return sprintf( "%2d%s%02d", deg, sgnS[sgn], min );
}

// Celestial body ID to symbol
function cnv2glyphP( pid ){
	var str;
	var strPlanet = new Array("As", "Mc");

	var gadr0 = "<img src=\"";
	var gadr1 = "../image/astropict/planet/p";
	var gadr2 = ".png\" alt=\"\"";
	var gadr3 = "\">";

	if(pid <= 12){
		str  = gadr0 + gadr1 + sprintf("%02d", pid - 1) + gadr2;
		str += planame[pid] + gadr3;
	} else {
		str  = strPlanet[pid - 13];
	}

	return str;
}

// Absolute degree to sign symbol string conversion
function cnv2glyph( adeg ){
	var gadr0 = "<img src=\"";
	var gadr1 = "../image/astropict/sign/s";
	var gadr2 = ".png\" alt=\"\"";
	var gadr3 = "\">";

	adeg = mod360(adeg);
	var sgn = Math.floor(adeg / 30.0);
	var deg = sprintf("%2d", Math.floor(adeg - sgn * 30.0));
	var min = sprintf("%02d", Math.floor((adeg - Math.floor( adeg )) * 60.0));
	var gadr  = gadr0 + gadr1 + sprintf("%02d", sgn) + gadr2;
	    gadr += sgnname[sgn] + gadr3;
	var str   = deg + gadr + min;

	return str;
}

// Absolute degree to aspect symbol string conversion
function asp2glyph( asp, orb1, orb2 ){
	var str;
	var gadr0 = "<img src=\"../image/astropict/aspect/a";
	var gadr1 = ".png\" alt=\"\"";
	var gadr2 = "\">";
	var aspTable = [0, 30, 36, 45, 60, 72, 90, 120, 135, 144, 150, 180];

	var aspectCheck = checkAspectStrictly(asp, orb1, orb2);
	var res  = aspectCheck[ 0 ];
	var diff = aspectCheck[ 1 ];

	if(res >= 0){
		var deg0 = Math.abs(diff);
		var deg  = Math.floor(deg0);
		var min  = Math.floor((deg0 - deg) * 60.0);
		str  = gadr0 + sprintf("%03d", aspTable[res]) + gadr1;
		str += aspTable[ res ] + gadr2;
		str += sprintf("%3d:%02d", deg, min);
	} else {
		str = "&nbsp;";
	}

	return str;
}
