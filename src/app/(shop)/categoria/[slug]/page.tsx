import { redirect } from 'next/navigation';

// Ruta legacy: /categoria/[slug] → /products?category=[slug]
// Mantiene compatibilidad con links externos o guardados.
interface Props {
  params: { slug: string };
}

export default function CategoriaRedirect({ params }: Props) {
  redirect(`/products?category=${params.slug.toLowerCase()}`);
}
