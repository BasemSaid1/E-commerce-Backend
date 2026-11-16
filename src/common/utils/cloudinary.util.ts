import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables are missing');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

// export const uploadToCloudinary = (
//   buffer: Buffer,
//   folder: string,
// ): Promise<UploadApiResponse> => {
//   ensureConfigured();

//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder,
//         resource_type: 'image',
//         timeout: 60000,
//         transformation: [{ width: 1600, crop: 'limit', quality: 'auto' }],
//       },
//       (error, result) => {
//         if (error) {
//           console.error(
//             'Cloudinary FULL error object:',
//             JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
//           );
//           return reject(error);
//         }

//         if (!result) {
//           return reject(new Error('Cloudinary upload failed'));
//         }

//         resolve(result);
//       },
//     );

//     uploadStream.end(buffer);
//   });
// };

export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
): Promise<UploadApiResponse> => {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        timeout: 60000,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }

        if (!result) {
          return reject(new Error('Cloudinary upload failed'));
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  ensureConfigured();

  await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
  });
};

export const getPublicIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:[^/]+\/)*?v\d+\/(.+)\.[^./]+$/);
  return match ? match[1] : null;
};

export const deleteImageByUrl = async (url?: string | null): Promise<void> => {
  if (!url || !url.includes('res.cloudinary.com')) return;

  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return;

  try {
    await deleteFromCloudinary(publicId);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
  }
};

export const deleteImagesByUrls = async (
  urls: Array<string | undefined | null>,
): Promise<void> => {
  await Promise.all(urls.map((url) => deleteImageByUrl(url)));
};
