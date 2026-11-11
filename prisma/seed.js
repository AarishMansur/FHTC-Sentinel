const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const data = require('../data/rajasthanHarGharJal.json');

const prisma = new PrismaClient();

const HAR_GHAR_JAL_SOURCE = 'har_ghar_jal';
const FINYEAR = '2026-2027';
const YEAR = 2027;

function slugForDistrictCode(name) {
  return (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'UNKNOWN';
}

function snapshotFor(row, year) {
  const total = Number(row.villages) || 0;
  const reported = Math.min(total, Number(row.hgjVillagesReported) || 0);
  const certified = Math.min(reported, Number(row.hgjVillagesCertified) || 0);
  return {
    districtId: '',
    year,
    totalVillages: total,
    zeroFhtcVillages: Math.max(0, total - reported),
    fullFhtcVillages: certified,
    otherBuckets: {
      source: HAR_GHAR_JAL_SOURCE,
      finyear: FINYEAR,
      villagesReported: reported,
      villagesCertified: certified,
      reportedNotCertified: Math.max(0, reported - certified),
      blocks: Number(row.blocks) || 0,
      hgjBlocksReported: Number(row.hgjBlocksReported) || 0,
      hgjBlocksCertified: Number(row.hgjBlocksCertified) || 0,
      panchayats: Number(row.panchayats) || 0,
      hgjPanchayatsReported: Number(row.hgjPanchayatsReported) || 0,
      hgjPanchayatsCertified: Number(row.hgjPanchayatsCertified) || 0,
    },
  };
}

async function main() {
  console.log('Seeding real Rajasthan Har Ghar Jal data (JJM Format J8)...');

  await prisma.auditLog.deleteMany();
  await prisma.briefing.deleteMany();
  await prisma.flag.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.district.deleteMany();

  let snapshotCount = 0;
  for (const row of data) {
    const district = await prisma.district.create({
      data: { state: 'Rajasthan', name: row.district, code: `RJ-${slugForDistrictCode(row.district)}` },
    });
    const snap = snapshotFor(row, YEAR);
    snap.districtId = district.id;
    await prisma.snapshot.create({ data: snap });
    snapshotCount += 1;
  }

  const hashedPassword = await bcrypt.hash('demo123', 10);

  await prisma.user.createMany({
    data: [
      { email: 'collector@ajmer.gov.in', name: 'Collector Ajmer', password: hashedPassword, role: 'collector', state: 'Rajasthan', district: 'Ajmer' },
      { email: 'collector@ganganagar.gov.in', name: 'Collector Ganganagar', password: hashedPassword, role: 'collector', state: 'Rajasthan', district: 'Ganganagar' },
      { email: 'state@jjm.gov.in', name: 'State JJM Cell', password: hashedPassword, role: 'state_admin', state: 'Rajasthan', district: null },
      { email: 'viewer@demo.gov.in', name: 'Viewer Demo', password: hashedPassword, role: 'viewer', state: 'Rajasthan', district: null },
    ],
  });

  console.log(`Seed complete: ${data.length} districts, ${snapshotCount} snapshots (FY ${FINYEAR}).`);
  console.log('Demo accounts (password: demo123):');
  console.log('  collector@ajmer.gov.in        (collector)');
  console.log('  collector@ganganagar.gov.in   (collector)');
  console.log('  state@jjm.gov.in              (state_admin)');
  console.log('  viewer@demo.gov.in            (viewer)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
