// S3-mos obyekt saqlash qatlami (Neon'da fayl saqlash yo'q).
//
// "Bucket" nomlari mantiqiy prefiks sifatida ishlatiladi: bitta S3 bucket ichida
// `branding/...` va `crm_attachments/...` kalitlari saqlanadi. Tenant chegarasi —
// kalitning birinchi segmenti (`{businessId}/`) — har doim server tomonida
// tekshiriladi, chunki presigned havolani faqat server beradi.
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StorageBucket = "branding" | "crm_attachments";

type Config = {
  bucket: string;
  region: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | undefined;
};

let cachedClient: S3Client | undefined;

function readConfig(): Config | null {
  const bucket = process.env["S3_BUCKET"];
  const accessKeyId = process.env["S3_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["S3_SECRET_ACCESS_KEY"];
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    region: process.env["S3_REGION"] ?? "auto",
    endpoint: process.env["S3_ENDPOINT"] || undefined,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: process.env["S3_PUBLIC_BASE_URL"]?.replace(/\/+$/, "") || undefined,
  };
}

export function storageConfigured(): boolean {
  return readConfig() !== null;
}

function requireConfig(): Config {
  const config = readConfig();
  if (!config) {
    throw new Error(
      "Fayl saqlash sozlanmagan: S3_BUCKET, S3_ACCESS_KEY_ID va S3_SECRET_ACCESS_KEY muhit o'zgaruvchilarini qo'shing.",
    );
  }
  return config;
}

function client(config: Config): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return cachedClient;
}

/** Yo'lda `..` yoki boshida `/` bo'lishiga yo'l qo'yilmaydi — kalit sohasidan chiqib ketmasin. */
function objectKey(bucket: StorageBucket, path: string): string {
  const clean = path.replace(/^\/+/, "");
  if (!clean || clean.includes("..")) throw new Error("Fayl yo'li noto'g'ri.");
  return `${bucket}/${clean}`;
}

export async function signedUploadUrl(
  bucket: StorageBucket,
  path: string,
  contentType: string,
  seconds = 300,
): Promise<string> {
  const config = requireConfig();
  return getSignedUrl(
    client(config),
    new PutObjectCommand({ Bucket: config.bucket, Key: objectKey(bucket, path), ContentType: contentType }),
    { expiresIn: seconds },
  );
}

export async function signedDownloadUrl(
  bucket: StorageBucket,
  path: string,
  seconds = 120,
): Promise<string> {
  const config = requireConfig();
  return getSignedUrl(
    client(config),
    new GetObjectCommand({ Bucket: config.bucket, Key: objectKey(bucket, path) }),
    { expiresIn: seconds },
  );
}

/** Ommaviy havola faqat CDN/bucket bazasi berilgan bo'lsa mavjud. */
export function publicObjectUrl(bucket: StorageBucket, path: string): string | null {
  const config = readConfig();
  if (!config?.publicBaseUrl) return null;
  return `${config.publicBaseUrl}/${objectKey(bucket, path)}`;
}

export async function deleteObjects(bucket: StorageBucket, paths: string[]): Promise<void> {
  const keys = paths.filter((path) => path.trim()).map((path) => ({ Key: objectKey(bucket, path) }));
  if (!keys.length) return;
  const config = requireConfig();
  await client(config).send(
    new DeleteObjectsCommand({ Bucket: config.bucket, Delete: { Objects: keys, Quiet: true } }),
  );
}
