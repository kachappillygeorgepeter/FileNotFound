const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('----------------------------------------------------');
  console.log('🔍 Checking Supabase Database Connection & Storage...');
  console.log('----------------------------------------------------');

  try {
    const rawResult = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('✅ Connected to database:', rawResult[0].current_database);
    console.log('✅ User:', rawResult[0].current_user);

    const shareCount = await prisma.share.count();
    const fileCount = await prisma.file.count();
    const activeShareCount = await prisma.share.count({
      where: {
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    console.log(`📊 Total Shares Ever Created: ${shareCount}`);
    console.log(`📊 Active (Non-Expired) Shares: ${activeShareCount}`);
    console.log(`📁 Total File Records in DB:  ${fileCount}`);
    console.log('----------------------------------------------------');

    if (shareCount > 0) {
      console.log('Recent 5 Shares in Database:');
      const recent = await prisma.share.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { files: true },
      });

      for (const s of recent) {
        console.log(`\n• Share ID:       ${s.id}`);
        console.log(`  Token Hash:     ${s.tokenHash.substring(0, 16)}...`);
        console.log(`  Downloads Used: ${s.downloadsUsed} / ${s.maxDownloads}`);
        console.log(`  Created At:     ${s.createdAt.toISOString()}`);
        console.log(`  Expires At:     ${s.expiresAt.toISOString()}`);
        console.log(`  Is Active:      ${new Date() < s.expiresAt && !s.deletedAt}`);
        console.log(`  Files (${s.files.length}):`);
        for (const f of s.files) {
          console.log(`    - ${f.originalName} (${f.sizeBytes} bytes, ${f.mimeType})`);
          console.log(`      Stored Name: ${f.storedName}`);
          console.log(`      SHA-256:     ${f.sha256}`);
        }
      }
    } else {
      console.log('ℹ️  No shares found in the database yet. Create an upload to see it appear here!');
    }
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

