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
    name: 'Wave Rider Smart Watch',
    description: 'Water-resistant smart watch with surf tracking, tide alerts, and UV monitoring. Perfect for the modern beach enthusiast.',
    price: 299.99,
    originalPrice: 349.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    category: 'Tech',
    colors: ['Teal', 'Coral', 'Sand'],
    inStock: true,
    featured: true,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: '2',
    name: 'Ocean Breeze Wireless Earbuds',
    description: 'Saltwater-proof earbuds with crystal clear sound and 24-hour battery life. Designed for active beach lifestyles.',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
    category: 'Tech',
    colors: ['White', 'Teal', 'Black'],
    inStock: true,
    featured: true,
    rating: 4.6,
    reviews: 89,
  },
  {
    id: '3',
    name: 'Solar Beach Charger',
    description: 'Portable solar panel with sand-resistant coating. Charge all your devices while enjoying the sun.',
    price: 89.99,
    originalPrice: 119.99,
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500',
    category: 'Tech',
    inStock: true,
    featured: true,
    rating: 4.5,
    reviews: 67,
  },
  {
    id: '4',
    name: 'Coastal Vibes Bluetooth Speaker',
    description: 'Waterproof speaker with 360° sound and floating design. The ultimate beach party companion.',
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
    category: 'Tech',
    colors: ['Coral', 'Teal', 'Sand'],
    inStock: true,
    rating: 4.7,
    reviews: 156,
  },
  {
    id: '5',
    name: 'Tech Beach Towel',
    description: 'Quick-dry microfiber towel with built-in wireless charging pocket. Merges comfort with technology.',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1519183071298-a2962feb14f4?w=500',
    category: 'Accessories',
    sizes: ['Standard', 'Large', 'XL'],
    colors: ['Ocean Blue', 'Sunset Coral', 'Sandy Beige'],
    inStock: true,
    rating: 4.4,
    reviews: 43,
  },
  {
    id: '6',
    name: 'Smart Cooler Bag',
    description: 'Insulated cooler with temperature display and USB ports. Keep drinks cold and devices charged.',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1594938328870-9623159c8c99?w=500',
    category: 'Accessories',
    colors: ['Teal', 'Navy', 'Coral'],
    inStock: true,
    rating: 4.6,
    reviews: 78,
  },
  {
    id: '7',
    name: 'UV Protection Smart Glasses',
    description: 'Polarized sunglasses with built-in UV index display and audio integration.',
    price: 199.99,
    originalPrice: 249.99,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
    category: 'Tech',
    colors: ['Black', 'Tortoise', 'Clear'],
    inStock: true,
    featured: true,
    rating: 4.9,
    reviews: 201,
  },
  {
    id: '8',
    name: 'Beach Tech Backpack',
    description: 'Waterproof backpack with solar panel, USB charging ports, and anti-theft features.',
    price: 159.99,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    category: 'Accessories',
    colors: ['Charcoal', 'Ocean Blue', 'Sand'],
    inStock: true,
    rating: 4.7,
    reviews: 112,
  },
];

export const categories = ['All', 'Tech', 'Accessories'];
