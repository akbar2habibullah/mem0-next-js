import { put } from '@/lib/blob';      // <<--- ADD THIS (adjust path if needed)
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine((file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type), {
      message: 'File type should be JPEG, PNG, GIF, or WEBP',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property on server-side
    const originalFilename = (formData.get('file') as File)?.name || 'untitled';
    const fileBuffer = await file.arrayBuffer(); // Vercel Blob's `put` can take ArrayBuffer

    try {
      // Call your custom put function
      const data = await put(
        originalFilename, // This will be the base for the S3 key
        Buffer.from(fileBuffer), // Ensure it's a Buffer for S3
        {
          access: 'public',
          contentType: file.type,
          // addRandomSuffix: true, // Default in our wrapper, like Vercel Blob
          // If you want to use originalFilename as the EXACT key (ensure it's unique):
          // addRandomSuffix: false,
        }
      );

      return NextResponse.json(data); // `data` will be of type CustomPutBlobResult
    } catch (error) {
      console.error("Upload Handler - put error:", error);
      // The error from our custom `put` will propagate here
      return NextResponse.json({ error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    }
  } catch (error) {
    console.error("Upload Handler - request processing error:", error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}