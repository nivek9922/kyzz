import { redirect } from 'next/navigation';

// Ruta legacy: /categoria/[slug] → /products?category=[slug]
// Mantiene compatibilidad con links externos o guardados.
interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CategoriaRedirect(props: Props) {
  const params = await props.params;
  redirect(`/products?category=${params.slug.toLowerCase()}`);
}
