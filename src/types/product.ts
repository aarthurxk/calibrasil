export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image: string | null;
  images: string[] | null;
  category: string;
  color: string[] | null;
  model: string[] | null;
  color_codes: Record<string, string> | null;
  sizes: string[] | null;
  in_stock: boolean | null;
  featured: boolean | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

// For backwards compatibility with static data
export interface LegacyProduct {
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
