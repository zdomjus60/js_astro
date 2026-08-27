/*
 * Latitude/longitude data file. That's all.
 * Copyright (c) 1999-2001, 2017 Yoshihiro Sakai & Sakai Institute of Astrology
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

function findPlaceCoor( pid ){
	if((pid < 1) || (pid > 47)) pid = 48;

	var lontbl = [0.0,
		141.70, 140.74, 141.15, 140.87, 140.10, 140.37,
		140.47, 140.48, 139.88, 139.05, 139.65, 140.12,
		139.69, 139.64, 139.02, 137.21, 136.66, 136.21,
		138.58, 138.18, 136.72, 138.38, 136.91, 136.51,
		135.86, 135.75, 135.52, 135.19, 135.83, 135.17,
		134.24, 133.05, 133.93, 132.45, 131.47, 134.56,
		134.04, 132.77, 133.53, 130.42, 130.30, 129.82,
		130.73, 131.61, 131.42, 130.55, 127.67,   0.00];

	var lattbl = [0.0,
		43.05, 40.82, 39.70, 38.26, 39.71, 38.23,
		37.74, 36.37, 36.56, 36.39, 35.85, 35.60,
		35.68, 35.43, 37.89, 36.68, 36.56, 36.06,
		35.66, 36.64, 35.38, 34.97, 35.17, 34.72,
		35.00, 35.02, 34.67, 34.68, 34.68, 34.22,
		35.50, 35.48, 34.65, 34.38, 34.17, 34.05,
		34.33, 33.87, 33.55, 33.61, 33.24, 32.74,
		32.78, 33.24, 31.91, 31.59, 26.21,  0.00];

	var coor = new Array(lontbl[pid], lattbl[pid]);
	return coor;
}

function nvPrefName( pid ){
	if((pid < 1) || (pid > 47)) pid = 48;

	var npref = ["",
		"Hokkaido", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata",
		"Fukushima", "Ibaraki", "Tochigi", "Gunma", "Saitama", "Chiba",
		"Tokyo", "Kanagawa", "Niigata", "Toyama", "Ishikawa", "Fukui",
		"Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi", "Mie",
		"Shiga", "Kyoto", "Osaka", "Hyogo", "Nara", "Wakayama",
		"Tottori", "Shimane", "Okayama", "Hiroshima", "Yamaguchi", "Tokushima",
		"Kagawa", "Ehime", "Kochi", "Fukuoka", "Saga", "Nagasaki",
		"Kumamoto", "Oita", "Miyazaki", "Kagoshima", "Okinawa", "Other/Overseas"];

	return npref[pid];
}
