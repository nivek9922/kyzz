import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pastelColors = [
  { name: 'Blanco roto',   hex: '#FAF7F2', sortOrder: 0 },
  { name: 'Crema',         hex: '#F5ECD7', sortOrder: 1 },
  { name: 'Beige',         hex: '#E8D5B7', sortOrder: 2 },
  { name: 'Rosa palo',     hex: '#F2C4CE', sortOrder: 3 },
  { name: 'Lavanda',       hex: '#D4C5E2', sortOrder: 4 },
  { name: 'Sage',          hex: '#B5C9B7', sortOrder: 5 },
  { name: 'Azul niebla',   hex: '#B8C9D9', sortOrder: 6 },
  { name: 'Terracota',     hex: '#C17A5E', sortOrder: 7 },
  { name: 'Marrón tierra', hex: '#8B6550', sortOrder: 8 },
  { name: 'Negro carbón',  hex: '#2C2C2C', sortOrder: 9 },
];

async function main() {
  console.log('Sembrando paleta de colores KYZZ...');
  for (const color of pastelColors) {
    await prisma.colorPalette.upsert({
      where:  { name: color.name },
      update: { hex: color.hex, sortOrder: color.sortOrder },
      create: color,
    });
    console.log(`  ✓ ${color.name} (${color.hex})`);
  }
  console.log('Paleta lista.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
