// Load all library files
const fs = require('fs');
const vm = require('vm');

const files = [
    'src/math.js',
    'src/astronomy.js',
    'src/geodata.js',
    'src/pluto.js',
    'src/hekichan.js',
    'src/metako.js',
    'src/cuspcal.js'
];

const sandbox = { Math, console, Array, Number, String, parseInt, parseFloat, isNaN, Date };
vm.createContext(sandbox);

for (const f of files) {
    const code = fs.readFileSync(f, 'utf-8');
    vm.runInContext(code, sandbox, { filename: f });
}

const { calPlanetPosition2, calHouseCusp2, calJD, calLST, calOblique } = sandbox;

function toZodiac(lon) {
    const signs = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Ca', 'Aq', 'Pi'];
    const l = ((lon % 360) + 360) % 360;
    const sign = Math.floor(l / 30);
    const deg = l % 30;
    const d = Math.floor(deg);
    const m = Math.floor((deg - d) * 60);
    return `${signs[sign]} ${d}°${String(m).padStart(2, '0')}'`;
}

function printPlanet(name, lon) {
    console.log(`  ${name.padEnd(10)} ${lon.toFixed(4).padStart(10)}°  ${toZodiac(lon)}`);
}

// Test 1: Solar Eclipse April 8, 2024 - Dallas TX
console.log('='.repeat(60));
console.log('TEST 1: Solar Eclipse - April 8, 2024 (Dallas, TX)');
console.log('='.repeat(60));
console.log('  2024/04/08 18:17 local - 32.78°N, 96.80°W\n');

let p1 = calPlanetPosition2(2024, 4, 8, 18, 17, -96.7970, 32.7767);
console.log('  Julian Day:', p1[0].toFixed(6));
console.log('');
console.log('  --- Major Planets ---');
printPlanet('Sun',     p1[1]);
printPlanet('Moon',    p1[2]);
printPlanet('Mercury', p1[3]);
printPlanet('Venus',   p1[4]);
printPlanet('Mars',    p1[5]);
printPlanet('Jupiter', p1[6]);
printPlanet('Saturn',  p1[7]);
printPlanet('Uranus',  p1[8]);
printPlanet('Neptune', p1[9]);
printPlanet('Pluto',   p1[10]);
console.log('');
console.log('  --- Points ---');
printPlanet('Node',    p1[11]);
printPlanet('Apogee',  p1[12]);
printPlanet('Asc',     p1[13]);
printPlanet('MC',      p1[14]);
console.log('');
console.log('  --- Minor Planets ---');
printPlanet('Ceres',   p1[15]);
printPlanet('Pallas',  p1[16]);
printPlanet('Juno',    p1[17]);
printPlanet('Vesta',   p1[18]);
printPlanet('Chiron',  p1[19]);

let c1 = calHouseCusp2(2024, 4, 8, 18, 17, -96.7970, 32.7767, 1);
console.log('');
console.log('  --- House Cusps (Placidus) ---');
for (let i = 1; i <= 12; i++) {
    console.log(`  House ${String(i).padStart(2)}: ${c1[i].toFixed(4)}°`);
}

// Test 2: Moon Landing July 20, 1969
console.log('\n' + '='.repeat(60));
console.log('TEST 2: Apollo 11 Moon Landing - July 20, 1969');
console.log('='.repeat(60));
console.log('  1969/07/20 20:17 local - New York 40.75°N, 73.99°W\n');

let p2 = calPlanetPosition2(1969, 7, 20, 20, 17, -73.9857, 40.7484);
console.log('  Julian Day:', p2[0].toFixed(6));
console.log('');
printPlanet('Sun',     p2[1]);
printPlanet('Moon',    p2[2]);
printPlanet('Mercury', p2[3]);
printPlanet('Venus',   p2[4]);
printPlanet('Mars',    p2[5]);
printPlanet('Jupiter', p2[6]);
printPlanet('Saturn',  p2[7]);
printPlanet('Uranus',  p2[8]);
printPlanet('Neptune', p2[9]);
printPlanet('Pluto',   p2[10]);

// Test 3: Now - Rome
console.log('\n' + '='.repeat(60));
console.log('TEST 3: Current sky - Rome, IT');
console.log('='.repeat(60));

const now = new Date();
const y = now.getFullYear(), mo = now.getMonth()+1, d = now.getDate();
const h = now.getHours(), mi = now.getMinutes();
console.log(`  ${y}/${String(mo).padStart(2,'0')}/${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')} local\n`);

let p3 = calPlanetPosition2(y, mo, d, h, mi, 12.4964, 41.9028);
printPlanet('Sun',     p3[1]);
printPlanet('Moon',    p3[2]);
printPlanet('Mercury', p3[3]);
printPlanet('Venus',   p3[4]);
printPlanet('Mars',    p3[5]);
printPlanet('Jupiter', p3[6]);
printPlanet('Saturn',  p3[7]);
printPlanet('Uranus',  p3[8]);
printPlanet('Neptune', p3[9]);
printPlanet('Pluto',   p3[10]);
