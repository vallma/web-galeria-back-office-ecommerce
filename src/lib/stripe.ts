// Helper para construir la URL de Stripe Checkout
// Se usa client-side desde la página de obra
export function getStripeCheckoutUrl(priceId: string): string {
  // La URL de checkout se construye en el servidor via API endpoint
  // En modo estático, usamos un endpoint de Netlify/Vercel o redirigimos
  return `/api/checkout?priceId=${priceId}`;
}
