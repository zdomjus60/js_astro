// Parse a geographic coordinate written either as decimal degrees or as
// degrees, minutes and seconds. Both notations are accepted for lon and lat.
//
// Accepted forms (hemisphere letters N/S/E/W and explicit +/ - signs are optional):
//   decimal degrees : "11.0", "-45.19", "+45,5" (comma decimal), "11,0"
//   DMS             : "45°15'30\"", "45 15 30", "45:15:30", "45°30'",
//                     "45°15'30\"N", "N45°15'30\"", "45°15'30\"W", "-45 15 30"
//
// Returns a finite number (decimal degrees) or NaN when the value is invalid.
// Minute/second components are constrained to [0,60) and the result to
// |value| <= 180 to reject nonsense input.
function parseCoord(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (v === null || v === undefined) return NaN;
    var s = String(v).trim();
    if (s === '') return NaN;

    var sign = 1;
    var t = s.toLowerCase();
    var hm = /^([nsew])(?=[\s\d+-])/.exec(t);
    var hemi = null;
    if (hm) {
        hemi = hm[1];
    } else {
        var h2 = /([nsew])\s*$/.exec(t);
        if (h2 && /[0-9]/.test(t.slice(0, h2.index))) hemi = h2[1];
    }
    if (hemi) {
        if (hemi === 's' || hemi === 'w') sign = -1;
        s = s.replace(new RegExp(hemi, 'i'), ' ');
    }
    if (!/[0-9]/.test(s)) return NaN;

    var orig = s;
    s = s.replace(/\u2212/g, '-');          // unicode minus -> hyphen
    s = s.replace(/''/g, ' ');              // double prime (seconds)
    s = s.replace(/[\u00b0\u00ba'\"\u2033\u2032\u2019\u2018`]/g, ' ');  // deg/min/sec markers
    s = s.replace(/:/g, ' ');               // colon separator (DDD:MM:SS)

    if (s.indexOf(',') !== -1) {
        var parts = s.split(',');
        var markerless = !/[\u00b0\u00ba'\"\u2033\u2032\u2019\u2018`:]/.test(orig);
        if (parts.length === 2 && markerless && /^\s*\d*\.?\d+\s*$/.test(parts[1])) {
            s = parts[0] + '.' + parts[1];
        } else {
            s = s.replace(/,/g, ' ');
        }
    }

    var okNum = /^[+-]?\d+(\.\d+)?$/;
    var toks = s.split(/[\s]+/).filter(Boolean);
    if (toks.length === 0 || toks.length > 3) return NaN;
    for (var i = 0; i < toks.length; i++) {
        if (!okNum.test(toks[i])) return NaN;
    }
    var nums = toks.map(parseFloat);

    var val;
    if (toks.length === 1) {
        val = Math.abs(nums[0]);
    } else {
        if (nums[1] < 0 || nums[1] >= 60) return NaN;
        val = Math.abs(nums[0]) + nums[1] / 60;
        if (toks.length === 3) {
            if (nums[2] < 0 || nums[2] >= 60) return NaN;
            val += nums[2] / 3600;
        }
    }
    if (nums[0] < 0) val = -val;
    val = val * sign;
    return (isFinite(val) && Math.abs(val) <= 180) ? val : NaN;
}