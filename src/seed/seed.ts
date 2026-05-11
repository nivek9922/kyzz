import bcryptjs from 'bcryptjs';

interface SeedProduct {
  description: string;
  images: string[];
  inStock: number;
  price: number;
  sizes: ValidSizes[];
  slug: string;
  tags: string[];
  title: string;
  type: ValidTypes;
  isFeatured?: boolean;
}

interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

type ValidSizes = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
type ValidTypes = 'jeans' | 'blusas' | 'enterizos' | 'chaquetas';

interface SeedData {
  users: SeedUser[];
  categories: string[];
  products: SeedProduct[];
}

export const initialData: SeedData = {

  users: [
    {
      email: 'fernando@google.com',
      name: 'Fernando Herrera',
      password: bcryptjs.hashSync('123456'),
      role: 'admin',
    },
    {
      email: 'melissa@google.com',
      name: 'Melissa Flores',
      password: bcryptjs.hashSync('123456'),
      role: 'user',
    },
  ],

  categories: ['Jeans', 'Blusas', 'Enterizos', 'Chaquetas'],

  products: [

    // ── JEANS ────────────────────────────────────────────────
    {
      description: "Jean de tiro alto con corte recto y slim. Confeccionado en denim premium 98% algodón con 2% elastano para mayor comodidad y libertad de movimiento. Detalle de costuras tonales y cierre frontal con botón cubierto.",
      images: ['1473809-00-A_1_2000.jpg', '1473809-00-A_alt.jpg'],
      inStock: 20,
      price: 189000,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      slug: "jean-tiro-alto-recto",
      type: 'jeans',
      tags: ['jeans', 'denim', 'tiro-alto'],
      title: "Jean Tiro Alto Recto",
      isFeatured: true,
    },
    {
      description: "Jean slim de tiro medio en denim índigo clásico. Cinco bolsillos, acabado lavado natural. Corte favorecedor que acompaña cada curva con elegancia contenida.",
      images: ['1473814-00-A_1_2000.jpg', '1473814-00-A_alt.jpg'],
      inStock: 15,
      price: 169000,
      sizes: ['XS', 'S', 'M', 'L'],
      slug: "jean-slim-tiro-medio",
      type: 'jeans',
      tags: ['jeans', 'denim', 'slim'],
      title: "Jean Slim Tiro Medio",
    },
    {
      description: "Jean wide leg de tiro alto en denim oscuro. Silueta amplia y fluida que alarga la figura. Ideal para combinar con blusa encajada o chaqueta corta.",
      images: ['1473819-00-A_1_2000.jpg', '1473819-00-A_alt.jpg'],
      inStock: 12,
      price: 195000,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      slug: "jean-wide-leg-oscuro",
      type: 'jeans',
      tags: ['jeans', 'denim', 'wide-leg'],
      title: "Jean Wide Leg Oscuro",
    },

    // ── BLUSAS ───────────────────────────────────────────────
    {
      description: "Blusa cropped de manga larga en punto modal suave. Cuello redondo y bajo redondeado que enmarca la cintura con delicadeza. Disponible en tono arena natural.",
      images: ['1740290-00-A_0_2000.jpg', '1740290-00-A_1.jpg'],
      inStock: 25,
      price: 89000,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      slug: "blusa-cropped-manga-larga-modal",
      type: 'blusas',
      tags: ['blusa', 'cropped', 'manga-larga'],
      title: "Blusa Cropped Manga Larga",
      isFeatured: true,
    },
    {
      description: "Blusa de escote en V suave con detalle de tirante fino. Confeccionada en viscosa fluida para una caída elegante. Perfecta para llevar sola o bajo una chaqueta oversize.",
      images: ['8765120-00-A_0_2000.jpg', '8765120-00-A_1.jpg'],
      inStock: 18,
      price: 79000,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      slug: "blusa-escote-v-viscosa",
      type: 'blusas',
      tags: ['blusa', 'escote-v', 'viscosa'],
      title: "Blusa Escote V Fluida",
    },
    {
      description: "Blusa cuello redondo de manga corta en algodón pima peruano. Silueta ligeramente holgada con bajo recto. Básico de lujo accesible para el guardarropa diario.",
      images: ['8765090-00-A_0_2000.jpg', '8765090-00-A_1.jpg'],
      inStock: 30,
      price: 69000,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      slug: "blusa-cuello-redondo-algodon",
      type: 'blusas',
      tags: ['blusa', 'basico', 'algodon'],
      title: "Blusa Cuello Redondo Algodón",
    },
    {
      description: "Blusa manga larga de cuello bote en punto suave. Detalle de costura visible en los hombros. Combina estructura y suavidad en una pieza atemporal.",
      images: ['8765100-00-A_0_2000.jpg', '8765100-00-A_1.jpg'],
      inStock: 22,
      price: 85000,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      slug: "blusa-manga-larga-cuello-bote",
      type: 'blusas',
      tags: ['blusa', 'manga-larga', 'cuello-bote'],
      title: "Blusa Manga Larga Cuello Bote",
    },
    {
      description: "Blusa asimétrica con nudo frontal en tela tejida ligera. Escote cuadrado y mangas 3/4. Piezas únicas diseñadas para hacer del básico algo especial.",
      images: ['1549275-00-A_0_2000.jpg', '1549275-00-A_1.jpg'],
      inStock: 10,
      price: 99000,
      sizes: ['XS', 'S', 'M', 'L'],
      slug: "blusa-asimetrica-nudo-frontal",
      type: 'blusas',
      tags: ['blusa', 'asimetrica', 'nudo'],
      title: "Blusa Asimétrica Nudo Frontal",
    },

    // ── ENTERIZOS ────────────────────────────────────────────
    {
      description: "Enterizo de manga corta en punto acanalado elástico. Escote cuadrado con tirantes anchos y calce ajustado. Versátil: llévalo solo o con jeans encima para un look completo.",
      images: ['1740226-00-A_0_2000.jpg', '1740226-00-A_1.jpg'],
      inStock: 14,
      price: 149000,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      slug: "enterizo-manga-corta-acanalado",
      type: 'enterizos',
      tags: ['enterizo', 'acanalado', 'manga-corta'],
      title: "Enterizo Acanalado Manga Corta",
      isFeatured: true,
    },
    {
      description: "Enterizo pantalón de tiro alto con espalda descubierta. Confeccionado en crepé mate de alta resistencia. Opción elegante para ocasiones especiales o cenas de noche.",
      images: ['9877040-00-A_0_2000.jpg', '9877040-00-A_1.jpg'],
      inStock: 8,
      price: 235000,
      sizes: ['XS', 'S', 'M', 'L'],
      slug: "enterizo-pantalon-espalda-descubierta",
      type: 'enterizos',
      tags: ['enterizo', 'pantalon', 'espalda-descubierta'],
      title: "Enterizo Pantalón Espalda Libre",
    },
    {
      description: "Enterizo corto oversize en felpa algodón. Cuello redondo y manga larga con puño. Comodidad sin renunciar al estilo: el aliado perfecto para días de calma.",
      images: ['1740260-00-A_0_2000.jpg', '1740260-00-A_1.jpg'],
      inStock: 16,
      price: 129000,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      slug: "enterizo-corto-oversize-felpa",
      type: 'enterizos',
      tags: ['enterizo', 'oversize', 'felpa'],
      title: "Enterizo Corto Oversize Felpa",
    },

    // ── CHAQUETAS ────────────────────────────────────────────
    {
      description: "Chaqueta puffer cropped con relleno de pluma sintética ultraligera. Cuello alto, cierre de cremallera y bolsillos laterales discretos. La prenda que define el lujo práctico.",
      images: ['1740535-00-A_0_2000.jpg', '1740535-00-A_1.jpg'],
      inStock: 9,
      price: 319000,
      sizes: ['XS', 'S', 'M', 'L'],
      slug: "chaqueta-puffer-cropped",
      type: 'chaquetas',
      tags: ['chaqueta', 'puffer', 'cropped'],
      title: "Chaqueta Puffer Cropped",
    },
    {
      description: "Chaqueta blazer oversize en lana italiana mezclada. Solapa de muesca, dos botones y bolsillos de parche. Atemporal, estructurada y absolutamente versátil.",
      images: ['1623735-00-A_0_2000.jpg', '1623735-00-A_1.jpg'],
      inStock: 11,
      price: 279000,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      slug: "chaqueta-blazer-oversize-lana",
      type: 'chaquetas',
      tags: ['chaqueta', 'blazer', 'oversize', 'lana'],
      title: "Chaqueta Blazer Oversize",
    },
    {
      description: "Chaqueta corta de cuero vegano con acabado mate. Cierre de cremallera asimétrico y manga larga. Piezas de transición que elevan cualquier conjunto al instante.",
      images: ['1633802-00-A_0_2000.jpg', '1633802-00-A_2.jpg'],
      inStock: 7,
      price: 259000,
      sizes: ['XS', 'S', 'M', 'L'],
      slug: "chaqueta-cuero-vegano-cremallera",
      type: 'chaquetas',
      tags: ['chaqueta', 'cuero-vegano', 'cremallera'],
      title: "Chaqueta Cuero Vegano",
    },
  ],
};
