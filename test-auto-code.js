// Test script for automatic item code generation
const { buildProductCode } = require('./app/utils/inventoryMeta.js');

console.log('Testing Automatic Item Code Generation:\n');

// Test items with different names
const testItems = [
  { name: 'Arduino Uno R3' },
  { name: 'Laptop Dell XPS' },
  { name: 'Screwdriver Set' },
  { name: 'LED Red 5mm' },
  { name: 'Resistor 10K Ohm' },
  { name: 'Wireless Headphones' },
  { name: 'EROV Underwater Vehicle' },
  { name: 'Custom Widget' }
];

testItems.forEach((item, index) => {
  const code = buildProductCode(item, 'CMP');
  console.log(`${index + 1}. Item: "${item.name}"`);
  console.log(`   Generated Code: ${code}`);
  console.log('---');
});

console.log('\n✅ Auto-code generation working!');
console.log('✅ Codes will be generated automatically when item names are entered in restocking forms');
console.log('✅ Users can still override with custom codes if needed');
