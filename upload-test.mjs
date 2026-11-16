import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config({ path: 'config/.env' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  secure: true,
});

// صورة 1x1 بكسل
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const cases = {
  'بدون أي خيارات': {},
  'مع folder': { folder: 'test' },
  'مع folder و transformation': {
    folder: 'test',
    transformation: [{ width: 1600, crop: 'limit', quality: 'auto' }],
  },
};

for (const [name, options] of Object.entries(cases)) {
  await new Promise((resolve) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: 'image', ...options },
        async (error, result) => {
          if (error) {
            console.log('FAIL', name, '->', error.http_code, error.message);
          } else {
            console.log('OK  ', name, '->', result.secure_url);
            await cloudinary.uploader.destroy(result.public_id).catch(() => {});
          }
          resolve();
        },
      )
      .end(png);
  });
}
