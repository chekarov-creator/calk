const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'полный_сортамент_гост_с_размерами.csv');
const jsonPath = path.join(__dirname, 'data', 'profiles.json');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n').filter(l => l.trim());

if (!lines.length) {
  console.error('CSV file is empty');
  process.exit(1);
}

const headers = lines[0].split(';').map(h => h.trim());
const data = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(';').map(v => v.trim());
  if (values.length !== headers.length) continue;
  
  const row = {};
  headers.forEach((h, idx) => {
    row[h] = values[idx];
  });
  data.push(row);
}

const db = {};

data.forEach(row => {
  const type = row['Тип конструкции']?.trim();
  const gost = row['ГОСТ']?.trim();
  const name = row['Обозначение']?.trim();
  
  if (!type || !gost || !name) return;
  
  const h = parseFloat(row['h, мм']?.replace(',', '.') || '0');
  const b = parseFloat(row['b, мм']?.replace(',', '.') || '0');
  const s = parseFloat(row['s, мм']?.replace(',', '.') || '0');
  const t = parseFloat(row['t, мм']?.replace(',', '.') || '0');
  const S_cm2 = parseFloat(row['Площадь, см2']?.replace(',', '.') || '0');
  const mass_kgm = parseFloat(row['Масса, кг/м']?.replace(',', '.') || '0');
  
  let kind = 'custom';
  let item = { name, S_cm2, mass_kgm };
  let mappedType = type;
  
  if (type === 'Двутавр') {
    kind = 'i';
    item = { ...item, kind, h, b, tw: s, tf: t };
  } else if (type === 'Швеллер') {
    kind = 'u';
    item = { ...item, kind, h, b, tw: s, tf: t };
  } else if (type === 'Профиль С-образный') {
    kind = 'u';
    item = { ...item, kind, h, b, tw: s, tf: s };
  } else if (type === 'Уголок равнополочный') {
    mappedType = 'Уголок (равнополочный)';
    kind = 'l';
    const nameParts = name.split('×');
    const tVal = nameParts.length >= 3 ? parseFloat(nameParts[2]?.replace(',', '.') || t) : t;
    item = { ...item, kind, b1: h, b2: b, t: tVal };
  } else if (type === 'Уголок неравнополочный') {
    mappedType = 'Уголок (неравнополочный)';
    kind = 'l';
    item = { ...item, kind, b1: h, b2: b, t };
  } else if (type === 'Профиль замкнутый') {
    mappedType = 'Профиль (кв/прям)';
    kind = 'rhs';
    item = { ...item, kind, H: h, B: b, t };
  }
  
  if (!db[mappedType]) db[mappedType] = {};
  if (!db[mappedType][gost]) db[mappedType][gost] = [];
  db[mappedType][gost].push(item);
});

if (!fs.existsSync(path.dirname(jsonPath))) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
}

fs.writeFileSync(jsonPath, JSON.stringify(db, null, 2), 'utf-8');
console.log(`Converted ${data.length} rows to JSON`);
console.log(`Types: ${Object.keys(db).join(', ')}`);
console.log(`Saved to: ${jsonPath}`);
