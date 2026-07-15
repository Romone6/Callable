import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

type ArtifactProvider = "s3" | "memory";

const memoryStore = new Map<string, string>();
let s3Client: S3Client | null = null;

function provider(): ArtifactProvider {
  return env.OBJECT_STORAGE_PROVIDER;
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.OBJECT_STORAGE_REGION,
      endpoint: env.OBJECT_STORAGE_ENDPOINT || undefined,
      credentials:
        env.OBJECT_STORAGE_ACCESS_KEY_ID && env.OBJECT_STORAGE_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
              secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
            }
          : undefined,
      forcePathStyle: env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
    });
  }
  return s3Client;
}

function buildObjectKey(params: { organisationId: string; resource: string; format: string }) {
  return `${params.organisationId}/${new Date().toISOString().replace(/[:.]/g, "-")}_${params.resource}_${randomUUID().slice(0, 8)}.${params.format}`;
}

export async function writeComplianceArtifact(params: {
  organisationId: string;
  resource: string;
  format: string;
  payload: string;
}) {
  if (provider() === "memory") {
    const key = `memory://${buildObjectKey(params)}`;
    memoryStore.set(key, params.payload);
    return key;
  }

  if (!env.OBJECT_STORAGE_BUCKET) {
    throw new Error("OBJECT_STORAGE_BUCKET is required when OBJECT_STORAGE_PROVIDER=s3");
  }

  const key = buildObjectKey(params);
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORAGE_BUCKET,
      Key: key,
      Body: params.payload,
      ContentType: params.format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
    }),
  );
  return `s3://${env.OBJECT_STORAGE_BUCKET}/${key}`;
}

export async function readComplianceArtifact(artifactPath: string) {
  if (artifactPath.startsWith("memory://")) {
    const value = memoryStore.get(artifactPath);
    if (value === undefined) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }
    return value;
  }

  if (!artifactPath.startsWith("s3://")) {
    throw new Error(`Unsupported artifact path: ${artifactPath}`);
  }

  const [, remainder] = artifactPath.split("s3://");
  const slashIndex = remainder.indexOf("/");
  if (slashIndex <= 0) {
    throw new Error(`Invalid s3 artifact path: ${artifactPath}`);
  }

  const bucket = remainder.slice(0, slashIndex);
  const key = remainder.slice(slashIndex + 1);
  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Artifact body empty for ${artifactPath}`);
  }

  return response.Body.transformToString();
}
