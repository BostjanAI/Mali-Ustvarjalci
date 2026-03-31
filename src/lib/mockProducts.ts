export type MockProduct = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  priceCents: number;
  images?: string[];
};

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'p1',
    slug: 'wooden-toy-fox',
    title: 'Wooden Toy Fox',
    description: 'Handmade wooden fox toy for kids 3+',
    priceCents: 1899,
  },
  {
    id: 'p2',
    slug: 'handmade-crayons',
    title: 'Handmade Crayons',
    description: 'Eco-friendly crayons in assorted colors',
    priceCents: 999,
  },
  {
    id: 'p3',
    slug: 'kid-paint-kit',
    title: 'Kids Paint Kit',
    description: 'Complete painting kit for kids',
    priceCents: 1499,
  },
  {
    id: 'p4',
    slug: 'origami-set',
    title: 'Origami Set',
    description: 'Colorful origami paper and instructions',
    priceCents: 1299,
  },
];





