import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ok, fail, badRequest } from "@/utils/api-response";

const s3Client = new S3Client({
  region: process.env.AWS_REGION_NAME,
  credentials: {
    accessKeyId:process.env.AWS_ACCESS_KEY_ID||"",
    secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY||"",
  },
});

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType } = await req.json();

    if (!fileName || !fileType) {
      return badRequest("fileName and fileType are required");
    }

    const bucketName = process.env.AWS_BUCKET_NAME;
    if (!bucketName) {
       return fail("AWS_BUCKET_NAME is not configured");
    }
    // Sanitize filename and add timestamp
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}-${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
      // Optional: ACL: 'public-read' if your bucket supports it and it's needed,
      // but usually bucket policies handle public access.
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Construct the public URL assuming the bucket has public access
    const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION_NAME || process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

    return ok({
      presignedUrl,
      publicUrl,
      fileName: uniqueFileName,
    }, 200, "Upload URL generated successfully");
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return fail(error.message || "Failed to generate presigned URL", 500);
  }
}
