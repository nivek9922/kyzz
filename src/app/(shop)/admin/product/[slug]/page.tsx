import { getCategories, getProductBySlug } from '@/actions';
import { Title } from '@/components';
import { redirect } from 'next/navigation';
import { ProductForm } from './ui/ProductForm';

interface Props {
  params: Promise<{
    slug: string;
  }>
}



export default async function ProductPage(props: Props) {
  const params = await props.params;

  const { slug } = params;

  const [ product, categories ] = await Promise.all([
    getProductBySlug(slug),
    getCategories()
  ]);


  // Todo: new
  if ( !product && slug !== 'new' ) {
    redirect('/admin/products')
  }

  const title = (slug === 'new') ? 'Nuevo producto' : 'Editar producto'

  return (
    <>
      <Title title={ title } />

      <ProductForm product={ product ?? {} } categories={ categories } />
    </>
  );
}