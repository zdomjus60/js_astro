import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calHouseCusp2
} from '../src/cuspcal.js'

import {
  calPlanetPosition2
} from '../src/hekichan.js'

test('calHouseCusp2 returns cusps, Dallas, April 8 2024', () => {
  const dallasLonLat = [-96.7970, 32.7767]
  const cusps = calHouseCusp2(
    2024, 4, 8, 18, 17, dallasLonLat[0], dallasLonLat[1], 1);

  assert.deepStrictEqual(
    cusps.slice(1).map(angle => +angle.toFixed(4)),
    [
      117.0236, 139.1819,
      165.0336, 196.2250,
      231.4282, 266.0756,
      297.0236, 319.1819,
      345.0336, 16.2250,
      51.4282, 86.0756
    ])
})

test('calPlanetPosition2 returns points, Los Angeles, October 4 2026', () => {
  const losAngelesLonLat = [-118.2437, 34.0522]
  const cusps = calHouseCusp2(
    2026, 10, 4, 16, 17, losAngelesLonLat[0], losAngelesLonLat[1], 1);
  const planets = calPlanetPosition2(
    2026, 10, 4, 16, 17, losAngelesLonLat[0], losAngelesLonLat[1]);

  const bodynames = [
    'Sun', 'Moon',
    'Mercury', 'Venus', 'Mars', 'Jupiter',
    'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'Notal Point', 'Apogee', 'Ascendant', 'MC',
    'Ceres', 'Pallas', 'Juno', 'Vesta', 'Chiron'
  ]

  assert.deepStrictEqual(
    planets.slice(1).map(
      (angle, i) => `${bodynames[i].padStart(11)}: ${+angle.toFixed(4)}°`),
    [
      '        Sun: 191.4536°',
      '       Moon: 116.1417°',
      '    Mercury: 215.3993°',
      '      Venus: 218.4476°',
      '       Mars: 123.8176°',
      '    Jupiter: 140.2352°',
      '     Saturn: 11.2886°',
      '     Uranus: 65.4489°',
      '    Neptune: 2.7536°',
      '      Pluto: 303.0972°',
      'Notal Point: 329.0221°',
      '     Apogee: 263.9351°',
      '  Ascendant: 221.2271°',
      '         MC: 136.9254°',
      '      Ceres: 107.2275°',
      '     Pallas: 14.6728°',
      '       Juno: 296.5558°',
      '      Vesta: 22.1599°',
      '     Chiron: 29.2915°'
    ])

  assert.deepStrictEqual(
    cusps.slice(1).map(angle => +angle.toFixed(4)),
    [
      221.2271, 250.4180,
      282.7628, 316.9254,
      349.4661,  17.6167,
      41.2271,   70.4180,
      102.7628, 136.9254,
      169.4661, 197.6167
    ])  
})
