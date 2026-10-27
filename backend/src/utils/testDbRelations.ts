import { prisma } from '../config/db.js';

async function testRelations() {
  console.log('Testing Prisma schema relations and cascading deletes...');

  const tokenHash = 'test_token_hash_' + Date.now();
  const sessionTokenHash = 'test_session_hash_' + Date.now();
  const storedName = 'test_stored_uuid_' + Date.now();

  // 1. Insert a Share with child File and AccessSession
  const share = await prisma.share.create({
    data: {
      tokenHash,
      maxDownloads: 3,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour ahead
      files: {
        create: [
          {
            originalName: 'test.pdf',
            storedName,
            sizeBytes: BigInt(1048576),
            mimeType: 'application/pdf',
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        ],
      },
      accessSessions: {
        create: [
          {
            sessionTokenHash,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes ahead
          },
        ],
      },
    },
    include: {
      files: true,
      accessSessions: true,
    },
  });

  console.log('✅ Created Share with related File and AccessSession:', {
    id: share.id,
    filesCount: share.files.length,
    sessionsCount: share.accessSessions.length,
  });

  // 2. Verify relations can be queried
  const queried = await prisma.share.findUnique({
    where: { id: share.id },
    include: { files: true, accessSessions: true },
  });

  if (!queried || queried.files.length !== 1 || queried.accessSessions.length !== 1) {
    throw new Error('Relation query verification failed');
  }
  console.log('✅ Verified relation query successfully.');

  // 3. Verify cascade delete
  await prisma.share.delete({
    where: { id: share.id },
  });

  const filesRemaining = await prisma.file.count({ where: { shareId: share.id } });
  const sessionsRemaining = await prisma.accessSession.count({ where: { shareId: share.id } });

  if (filesRemaining !== 0 || sessionsRemaining !== 0) {
    throw new Error('Cascade delete verification failed');
  }
  console.log('✅ Verified cascade delete (associated files and sessions removed on share delete).');

  await prisma.$disconnect();
  console.log('🎉 All relation and cascade tests passed.');
}

testRelations().catch((err) => {
  console.error('❌ Error during relation test:', err);
  process.exit(1);
});
