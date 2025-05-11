import { config } from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput, // If you need to access S3 specific output
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

config({
  path: '.env.local',
});

// --- S3 Client Configuration ---
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_PUBLIC_HOSTNAME = process.env.S3_PUBLIC_HOSTNAME;

if (
  !S3_ENDPOINT ||
  !S3_ACCESS_KEY_ID ||
  !S3_SECRET_ACCESS_KEY ||
  !S3_BUCKET_NAME ||
  !S3_PUBLIC_HOSTNAME
) {
  // Log the error but don't throw here if this lib might be imported in environments
  // where S3 isn't immediately needed (e.g., client-side, though this function is server-side).
  // A check before calling `put` or lazy initialization could be alternatives.
  // For a server-only lib, throwing here is fine.
  console.error("S3 configuration environment variables are missing!");
  // throw new Error("S3 configuration environment variables are missing!");
}

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID!, // Use non-null assertion if you check above
    secretAccessKey: S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

/**
 * Mimics the Vercel Blob PutBlobResult interface.
 * Adjust as needed if your frontend relies on other specific fields.
 */
export interface CustomPutBlobResult {
  url: string;
  downloadUrl: string;
  pathname: string; // The final key used in S3 (potentially with suffix)
  contentType?: string;
  contentDisposition: string; // e.g., `inline; filename="originalFilename.jpg"`
  // You might want to add s3Response.ETag or s3Response.VersionId if needed
  eTag?: string;
  versionId?: string;
}

interface PutOptions {
  access: 'public' | 'private'; // Vercel Blob has 'private', S3 default is private
  contentType?: string;
  /**
   * If true (default), a random suffix is added to the pathname to prevent overwrites.
   * Set to false if you are providing a fully unique pathname.
   * Vercel's `put` adds a random suffix by default.
   */
  addRandomSuffix?: boolean;
  /**
   * For S3 Cache-Control header. e.g. 'max-age=3600'
   * Vercel Blob supports cacheControlMaxAge (in seconds).
   */
  cacheControl?: string;
  cacheControlMaxAge?: number; // Vercel Blob specific option
}

/**
 * Uploads a file to S3-compatible storage, mimicking Vercel Blob's `put` function.
 * @param originalPathname The desired pathname for the blob. A random suffix will be added by default.
 * @param body The content of the blob.
 * @param options Configuration for the upload.
 * @returns A promise that resolves with the blob's metadata.
 */
export async function put(
  originalPathname: string,
  body: Buffer | Uint8Array | Blob | string | ReadableStream, // AWS SDK v3 Body types
  options: PutOptions,
): Promise<CustomPutBlobResult> {
  if (!s3Client.config.credentials) {
    throw new Error("S3 client not properly configured. Check environment variables.");
  }

  let key = originalPathname;
  const addSuffix = options.addRandomSuffix !== false; // Default to true

  if (addSuffix) {
    const randomSuffix = uuidv4().slice(0, 8); // Shorter UUID part
    const extension = originalPathname.includes('.')
      ? originalPathname.substring(originalPathname.lastIndexOf('.'))
      : '';
    const nameWithoutExtension = extension
      ? originalPathname.substring(0, originalPathname.lastIndexOf('.'))
      : originalPathname;
    key = `${nameWithoutExtension}-${randomSuffix}${extension}`;
  }

  const s3Params: PutObjectCommandInput = {
    Bucket: S3_BUCKET_NAME!,
    Key: key,
    Body: body instanceof globalThis.Blob ? await body.arrayBuffer() : body, // Convert Blob to ArrayBuffer/Buffer if needed by SDK for stream/size
  };

  if (options.contentType) {
    s3Params.ContentType = options.contentType;
  } else if (body instanceof globalThis.Blob && body.type) {
    s3Params.ContentType = body.type;
  }

  if (options.access === 'public') {
    s3Params.ACL = 'public-read';
  }
  // Note: For 'private' access, S3 default is private, so no ACL needed unless overriding bucket policy

  if (options.cacheControl) {
    s3Params.CacheControl = options.cacheControl;
  } else if (options.cacheControlMaxAge !== undefined) {
    s3Params.CacheControl = `max-age=${options.cacheControlMaxAge}`;
  }


  try {
    const command = new PutObjectCommand(s3Params);
    const s3Response: PutObjectCommandOutput = await s3Client.send(command);

    const publicUrl = `${S3_PUBLIC_HOSTNAME!.replace(/\/$/, '')}/${S3_BUCKET_NAME!.replace(/^\//, '')}/${key}`;

    return {
      url: publicUrl,
      downloadUrl: publicUrl + '?download=1',
      pathname: key, // The actual key stored in S3
      contentType: s3Params.ContentType,
      contentDisposition: `inline; filename="${originalPathname}"`, // Use original for user-facing filename
      eTag: s3Response.ETag?.replace(/"/g, ''), // S3 ETag often has quotes
      versionId: s3Response.VersionId,
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    // Re-throw or handle as appropriate for your application
    // This allows the calling function to catch it as if Vercel Blob failed
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// You could also implement other Vercel Blob methods here if needed:
// export async function del(url: string | string[]): Promise<void> { /* ... */ }
// export async function head(url: string): Promise<HeadBlobResult | null> { /* ... */ }
// export async function list(options?: ListCommandOptions): Promise<ListBlobResult> { /* ... */ }
// export async function copy(sourceUrl: string, destinationPathname: string, options: CopyCommandOptions): Promise<PutBlobResult> { /* ... */ }