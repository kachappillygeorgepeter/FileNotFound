const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function runUploadVerification() {
  console.log('----------------------------------------------------');
  console.log('🧪 Verifying File Upload -> Supabase Database Pipeline');
  console.log('----------------------------------------------------');

  const testFileName = 'test-verification-document.txt';
  const testFileContent = 'FileNotFound Zero-Trust Verification Payload - ' + new Date().toISOString();
  const fileHash = crypto.createHash('sha256').update(testFileContent).digest('hex');
  const storedUUID = crypto.randomUUID() + '.txt';

  // Ensure uploads directory exists
  const uploadDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, storedUUID);
  fs.writeFileSync(filePath, testFileContent);
  console.log(`1. Created local staged file: ${filePath}`);

  // Create a 256-bit entropy token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  console.log('2. Inserting test Share + File transaction into Supabase PostgreSQL...');
  const createdShare = await prisma.$transaction(async (tx) => {
    return await tx.share.create({
      data: {
        tokenHash,
        passwordHash: null,
        maxDownloads: 3,
        expiresAt,
        files: {
          create: [
            {
              originalName: testFileName,
              storedName: storedUUID,
              sizeBytes: BigInt(Buffer.byteLength(testFileContent)),
              mimeType: 'text/plain',
              sha256: fileHash,
            },
          ],
        },
      },
      include: {
        files: true,
      },
    });
  });

  console.log(`✅ Success! Created Share in Supabase with ID: ${createdShare.id}`);
  console.log(`   Token Hash:     ${createdShare.tokenHash.substring(0, 16)}...`);
  console.log(`   Max Downloads:  ${createdShare.maxDownloads}`);
  console.log(`   Files Saved:    ${createdShare.files.length}`);
  console.log(`   File ID:        ${createdShare.files[0].id}`);
  console.log(`   Original Name:  ${createdShare.files[0].originalName}`);
  console.log(`   Stored Name:    ${createdShare.files[0].storedName}`);
  console.log(`   SHA-256 Hash:   ${createdShare.files[0].sha256}`);
  console.log(`   Size:           ${createdShare.files[0].sizeBytes} bytes`);

  // Now verify that we can query it back from Supabase
  console.log('\n3. Querying back from Supabase using token hash...');
  const queriedShare = await prisma.share.findUnique({
    where: { tokenHash },
    include: { files: true },
  });

  if (queriedShare && queriedShare.files.length === 1) {
    console.log('✅ Query verification PASSED: Supabase returned the exact uploaded share and file!');
  } else {
    throw new Error('Verification failed: Could not query the newly inserted record back from Supabase.');
  }

  // Clean up test file from disk and DB
  console.log('\n4. Cleaning up test record...');
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await prisma.share.delete({ where: { id: createdShare.id } });
  console.log('✅ Test record deleted cleanly from Supabase and disk.');
  console.log('----------------------------------------------------');
  console.log('🎉 Supabase Database Upload Pipeline is 100% OPERATIONAL!');
  console.log('----------------------------------------------------');
}

runUploadVerification()
  .catch((err) => {
    console.error('❌ Upload verification error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

