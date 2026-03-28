import { PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS } from '@screen-commander/shared';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Create default settings
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      data: JSON.stringify(DEFAULT_SETTINGS),
    },
    update: {},
  });

  console.log('Default settings created');

  // Create sample favorites
  const favorites = [
    { name: 'Google', url: 'https://www.google.com', type: 'WEB_URL', icon: 'globe', order: 0 },
    { name: 'YouTube', url: 'https://www.youtube.com', type: 'WEB_URL', icon: 'video', order: 1 },
    { name: 'Clock Widget', url: 'https://time.is', type: 'WEB_URL', icon: 'clock', order: 2 },
    { name: 'Weather', url: 'https://weather.com', type: 'WEB_URL', icon: 'cloud', order: 3 },
  ];

  for (const fav of favorites) {
    await prisma.favorite.upsert({
      where: { id: `seed-${fav.name.toLowerCase().replace(/\s+/g, '-')}` },
      create: {
        id: `seed-${fav.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...fav,
      },
      update: {},
    });
  }

  console.log('Sample favorites created');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
