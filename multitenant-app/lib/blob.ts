import { put, del } from '@vercel/blob'

export async function uploadToBlob(
  path: string,
  data: Buffer,
  contentType: string
): Promise<{ url: string; pathname: string }> {
  const blob = await put(path, data, { access: 'public', contentType })
  return { url: blob.url, pathname: blob.pathname }
}

export async function deleteFromBlob(url: string): Promise<void> {
  await del(url)
}

export function galleryBlobPath(landlordId: string, filename: string): string {
  return `landlord/${landlordId}/gallery/${Date.now()}-${filename}`
}

export function logoBlobPath(landlordId: string, filename: string): string {
  return `landlord/${landlordId}/logo/${Date.now()}-${filename}`
}
