export type MockProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  images: string[];
  categoryPath: string;
  titleEn: string;
  descriptionEn: string;
};
// Illustrative demo products, never supplier stock or verified product specifications.
export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'p1',
    slug: 'wooden-toy-fox',
    title: 'Lesena lisička',
    titleEn: 'Wooden toy fox',
    description:
      'Mala lisička za velike zgodbe. Ideja za domišljijsko igro in odkrivanje gozdnega sveta.',
    descriptionEn:
      'A little fox for big stories. An idea for imaginative play and discovering the woodland world.',
    priceCents: 1899,
    images: ['/images/fox.svg'],
    categoryPath: 'wooden-toys',
  },
  {
    id: 'p2',
    slug: 'handmade-crayons',
    title: 'Pisane voščenke',
    titleEn: 'Colourful crayons',
    description:
      'Od prve črte do pisanih svetov. Povabilo k risanju, barvanju in raziskovanju barv.',
    descriptionEn:
      'From a first line to colourful worlds. An invitation to draw, colour and explore.',
    priceCents: 999,
    images: ['/images/crayons.svg'],
    categoryPath: 'art-craft',
  },
  {
    id: 'p3',
    slug: 'kid-paint-kit',
    title: 'Mali slikarski atelje',
    titleEn: 'Little painting studio',
    description:
      'Čopiči, barve in prostor za lastne zamisli. Ustvarjalni navdih za skupne popoldneve.',
    descriptionEn:
      'Brushes, colours and space for your own ideas. Creative inspiration for afternoons together.',
    priceCents: 1499,
    images: ['/images/paint.svg'],
    categoryPath: 'art-craft',
  },
  {
    id: 'p4',
    slug: 'origami-set',
    title: 'Papirnate dogodivščine',
    titleEn: 'Paper adventures',
    description:
      'Prepogib za prepogibom nastajajo nove oblike. Navdih za potrpežljivost in ustvarjanje s papirjem.',
    descriptionEn:
      'New shapes emerge fold by fold. Inspiration for patience and creating with paper.',
    priceCents: 1299,
    images: ['/images/origami.svg'],
    categoryPath: 'diy-kits',
  },
];
export function localizeMockProduct(product: MockProduct, locale: string) {
  return {
    ...product,
    availability: 'demo' as const,
    title: locale === 'en' ? product.titleEn : product.title,
    description: locale === 'en' ? product.descriptionEn : product.description,
  };
}
