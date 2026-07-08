// Inicia un pago Redsys: busca la obra en Sanity, firma los parámetros
// y devuelve un formulario auto-enviado hacia el TPV de BBVA/Redsys.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@sanity/client';
import { REDSYS_URL, encodeParams, sign, makeOrderNumber } from './_lib/redsys';

const sanity = createClient({
  projectId: (process.env.SANITY_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID)!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
});

const SITE_URL = process.env.SITE_URL ?? 'https://espaibarrivell.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.REDSYS_SECRET_KEY;
  const merchantCode = process.env.REDSYS_MERCHANT_CODE;
  if (!secret || !merchantCode) {
    return res.status(500).json({ error: 'Redsys no configurado' });
  }

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body ?? {};
  const obraId = body.obraId as string | undefined;
  const obraSlug = body.obraSlug as string | undefined;
  if (!obraId || !obraSlug) return res.status(400).json({ error: 'Falta obraId/obraSlug' });

  const obra = await sanity.fetch<{ titol: string; preu: number; sold: boolean } | null>(
    `*[_type == "obra" && _id == $id][0]{ titol, preu, sold }`,
    { id: obraId }
  );
  if (!obra || typeof obra.preu !== 'number') return res.status(404).json({ error: 'Obra no trobada' });
  if (obra.sold) return res.redirect(302, `${SITE_URL}/botiga/${obraSlug}`);

  const order = makeOrderNumber();
  const params = {
    DS_MERCHANT_AMOUNT: String(Math.round(obra.preu * 100)),
    DS_MERCHANT_ORDER: order,
    DS_MERCHANT_MERCHANTCODE: merchantCode,
    DS_MERCHANT_CURRENCY: '978', // EUR
    DS_MERCHANT_TRANSACTIONTYPE: '0', // autorización
    DS_MERCHANT_TERMINAL: process.env.REDSYS_TERMINAL ?? '1',
    DS_MERCHANT_MERCHANTURL: `https://${req.headers.host}/api/redsys-notification`,
    DS_MERCHANT_URLOK: `${SITE_URL}/botiga/gracies`,
    DS_MERCHANT_URLKO: `${SITE_URL}/botiga/${obraSlug}?pagament=ko`,
    DS_MERCHANT_MERCHANTDATA: obraId,
    DS_MERCHANT_PRODUCTDESCRIPTION: (obra.titol ?? 'Obra').slice(0, 125),
    DS_MERCHANT_CONSUMERLANGUAGE: '003', // catalán
  };

  const paramsB64 = encodeParams(params);
  const signature = sign(order, paramsB64, secret);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="ca"><head><meta charset="utf-8"><title>Redirigint al pagament segur…</title></head>
<body onload="document.forms[0].submit()">
  <p style="font-family:sans-serif;text-align:center;margin-top:4rem">Redirigint al pagament segur de BBVA…</p>
  <form action="${REDSYS_URL}" method="POST">
    <input type="hidden" name="Ds_SignatureVersion" value="HMAC_SHA256_V1">
    <input type="hidden" name="Ds_MerchantParameters" value="${paramsB64}">
    <input type="hidden" name="Ds_Signature" value="${signature}">
    <noscript><button type="submit">Continuar al pagament</button></noscript>
  </form>
</body></html>`);
}
