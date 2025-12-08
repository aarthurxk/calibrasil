export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  sizes?: string[];
  colors?: string[];
  inStock: boolean;
  featured?: boolean;
  rating: number;
  reviews: number;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Smartwatch Onda Perfeita',
    description: 'Relógio inteligente à prova d\'água com rastreamento de surf, alertas de maré e monitoramento UV. Perfeito pro surfista moderno que não dispensa tecnologia.',
    price: 1499.90,
    originalPrice: 1749.90,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    category: 'Tech',
    colors: ['Verde-água', 'Coral', 'Areia'],
    inStock: true,
    featured: true,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: '2',
    name: 'Fones Brisa do Mar',
    description: 'Fones wireless à prova de água salgada com som cristalino e 24h de bateria. Feito pra quem vive na ativa e não para nunca.',
    price: 749.90,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
    category: 'Tech',
    colors: ['Branco', 'Verde-água', 'Preto'],
    inStock: true,
    featured: true,
    rating: 4.6,
    reviews: 89,
  },
  {
    id: '3',
    name: 'Carregador Solar de Praia',
    description: 'Painel solar portátil com revestimento anti-areia. Carrega todos os seus dispositivos enquanto você curte o sol. Sustentabilidade é nosso nome do meio!',
    price: 449.90,
    originalPrice: 599.90,
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500',
    category: 'Tech',
    inStock: true,
    featured: true,
    rating: 4.5,
    reviews: 67,
  },
  {
    id: '4',
    name: 'Caixinha Vibes Costeiras',
    description: 'Caixa de som à prova d\'água com som 360° e design flutuante. O parça perfeito pra sua festa na praia. Bota pra tocar!',
    price: 649.90,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
    category: 'Tech',
    colors: ['Coral', 'Verde-água', 'Areia'],
    inStock: true,
    rating: 4.7,
    reviews: 156,
  },
  {
    id: '5',
    name: 'Toalha Tech Praiana',
    description: 'Toalha de microfibra secagem rápida com bolso para carregamento wireless. Conforto e tecnologia andando de mãos dadas!',
    price: 299.90,
    image: 'https://images.unsplash.com/photo-1519183071298-a2962feb14f4?w=500',
    category: 'Acessórios',
    sizes: ['Normal', 'Grande', 'GG'],
    colors: ['Azul Oceano', 'Coral Sunset', 'Bege Areia'],
    inStock: true,
    rating: 4.4,
    reviews: 43,
  },
  {
    id: '6',
    name: 'Cooler Inteligente',
    description: 'Bolsa térmica com display de temperatura e portas USB. Mantém a bebida gelada e o celular carregado. Dois coelhos numa cajadada só!',
    price: 399.90,
    image: 'https://images.unsplash.com/photo-1594938328870-9623159c8c99?w=500',
    category: 'Acessórios',
    colors: ['Verde-água', 'Marinho', 'Coral'],
    inStock: true,
    rating: 4.6,
    reviews: 78,
  },
  {
    id: '7',
    name: 'Óculos Smart Anti-UV',
    description: 'Óculos polarizados com display de índice UV integrado e áudio. Estilo e proteção num só produto. É pra arrasar!',
    price: 999.90,
    originalPrice: 1249.90,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
    category: 'Tech',
    colors: ['Preto', 'Tartaruga', 'Transparente'],
    inStock: true,
    featured: true,
    rating: 4.9,
    reviews: 201,
  },
  {
    id: '8',
    name: 'Mochila Tech de Praia',
    description: 'Mochila impermeável com painel solar, portas USB e sistema antifurto. Leva tudo que você precisa com segurança e estilo!',
    price: 799.90,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    category: 'Acessórios',
    colors: ['Carvão', 'Azul Oceano', 'Areia'],
    inStock: true,
    rating: 4.7,
    reviews: 112,
  },
];

export const categories = ['Todos', 'Tech', 'Acessórios'];
