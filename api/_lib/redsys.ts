// Firma y utilidades del TPV Virtual Redsys (HMAC_SHA256_V1)
import { createCipheriv, createHmac, timingSafeEqual } from 'node:crypto';

export const REDSYS_URL =
  process.env.REDSYS_ENVIRONMENT === 'test'
    ? 'https://sis-t.redsys.es:25443/sis/realizarPago'
    : 'https://sis.redsys.es/sis/realizarPago';

/** Deriva la clave de operación: 3DES-CBC de la clave secreta sobre el nº de pedido */
function deriveOrderKey(order: string, secretB64: string): Uint8Array {
  const key = new Uint8Array(Buffer.from(secretB64, 'base64')); // 24 bytes
  const iv = new Uint8Array(8);
  const cipher = createCipheriv('des-ede3-cbc', key, iv);
  cipher.setAutoPadding(false);
  const padded = Buffer.alloc(Math.ceil(order.length / 8) * 8, 0);
  padded.write(order, 'utf8');
  return new Uint8Array(Buffer.concat([new Uint8Array(cipher.update(new Uint8Array(padded))), new Uint8Array(cipher.final())]));
}

export function encodeParams(params: Record<string, string>): string {
  return Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
}

export function decodeParams(b64: string): Record<string, string> {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
}

export function sign(order: string, paramsB64: string, secretB64: string): string {
  const key = deriveOrderKey(order, secretB64);
  return createHmac('sha256', key).update(paramsB64).digest('base64');
}

/** Verifica la firma de una notificación de Redsys (llega en base64url) */
export function verifySignature(paramsB64: string, signature: string, secretB64: string): boolean {
  const params = decodeParams(paramsB64);
  const order = params.Ds_Order ?? params.DS_ORDER;
  if (!order) return false;
  const normalize = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');
  const expected = new Uint8Array(Buffer.from(normalize(sign(order, paramsB64, secretB64))));
  const received = new Uint8Array(Buffer.from(normalize(signature)));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Nº de pedido único: 12 dígitos (Redsys exige 4 numéricos + hasta 8 alfanuméricos) */
export function makeOrderNumber(): string {
  return Date.now().toString().slice(-12);
}

/** Código autorizado: Ds_Response entre 0000 y 0099 */
export function isAuthorized(dsResponse: string | undefined): boolean {
  if (!dsRe