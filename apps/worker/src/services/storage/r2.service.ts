export async function putTextObject(bucket: R2Bucket, key: string, value: string): Promise<void> {
  await bucket.put(key, value, {
    httpMetadata: {
      contentType: "text/plain; charset=utf-8"
    }
  });
}

export async function getTextObject(bucket: R2Bucket, key: string): Promise<string | null> {
  const object = await bucket.get(key);
  return object ? object.text() : null;
}
