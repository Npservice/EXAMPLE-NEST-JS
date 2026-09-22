import { createHmac, timingSafeEqual } from 'node:crypto';

function sign(baseUrl: string, expires: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${baseUrl}:${expires}`)
    .digest('hex');
}

export function generateSignedUrl(
  baseUrl: string,
  expiresInMs: number,
  secret: string,
): string {
  const expires = Math.floor((Date.now() + expiresInMs) / 1000);
  const signature = sign(baseUrl, expires, secret);

  const url = new URL(baseUrl);
  url.searchParams.set('expires', String(expires));
  url.searchParams.set('signature', signature);
  return url.toString();
}

export function validateSignedUrl(fullUrl: string, secret: string): boolean {
  const url = new URL(fullUrl);
  const expires = url.searchParams.get('expires');
  const signature = url.searchParams.get('signature');

  if (!expires || !signature) {
    return false;
  }

  if (Math.floor(Date.now() / 1000) > Number(expires)) {
    return false;
  }

  url.searchParams.delete('expires');
  url.searchParams.delete('signature');
  const baseUrl = url.toString();

  const expected = sign(baseUrl, Number(expires), secret);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);

  return (
    expectedBuf.length === actualBuf.length &&
    timingSafeEqual(expectedBuf, actualBuf)
  );
}
