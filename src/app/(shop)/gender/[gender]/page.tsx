import { redirect } from 'next/navigation';

// Ruta eliminada — gender ya no existe como filtro.
// Redirige cualquier /gender/* a /products para no romper links externos.
export default function GenderRedirectPage() {
  redirect('/products');
}
