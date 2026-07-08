// Notificación online de Redsys: verifica la firma y, si el pago está
// autorizado, marca la obra como vendida en Sanity.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@sanity/client';
import { decodeParams, verifySignature, isAuthorized } from './_lib/redsys';

const sanity = createClient({
  projectId: (process.env.SANITY_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID)!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
  apiVersion: '2024-01-01',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.REDSYS_SECRET_KEY;
  if (!secret) return res.status(500).json({ error: 'Redsys no configurado' });

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body ?? {};
  const paramsB64 = body.Ds_MerchantParameters as string | undefined;
  const signature = body.Ds_Signature as string | undefined;
  if (!paramsB64 || !signature) return res.status(400).json({ error: 'Notificación incompleta' });

  if (!verifySignature(paramsB64, signature, secret)) {
    console.error('Redsys: firma inválida');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const params = decodeParams(paramsB64);
  const authorized = isAuthorized(params.Ds_Response);
  const obraId = params.Ds_MerchantData ? decodeURIComponent(params.Ds_MerchantData) : undefined;

  if (authorized && obraId) {
    try {
      await sanity.patch(obraId).set({ sold: true }).commit();
      if (process.env.DEPLOY_HOOK_URL) {
        await fetch(process.env.DEPLOY_HOOK_URL, { method: 'POST' });
      }
    } catch (err) {
      console.error('Error actualizando Sanity:', err);
      return res.status(500).json({ error: 'Failed to update inventory' });
    }
  }

  return res.status(200).json({ received: true });
}
