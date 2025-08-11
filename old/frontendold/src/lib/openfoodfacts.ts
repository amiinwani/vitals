// OpenFoodFacts API integration

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  image_url?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
  countries?: string;
  nutrition_grades?: string;
  nutriments?: {
    energy_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    proteins_100g?: number;
    salt_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    [key: string]: unknown;
  };
  ingredients_text?: string;
  allergens?: string;
  additives?: string[];
  [key: string]: unknown;
}

export interface OpenFoodFactsSearchResponse {
  products: OpenFoodFactsProduct[];
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  skip: number;
}

const BASE_URL = 'https://world.openfoodfacts.org';

export async function searchProducts(
  query: string,
  page: number = 1,
  pageSize: number = 24
): Promise<OpenFoodFactsSearchResponse> {
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=${pageSize}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to search products: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}

export async function getProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const url = `${BASE_URL}/api/v0/product/${barcode}.json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.status === 1 ? data.product : null;
  } catch (error) {
    console.error('Error getting product:', error);
    return null;
  }
}

export async function getRandomProducts(count: number = 20): Promise<OpenFoodFactsProduct[]> {
  // Get products from popular categories to ensure good images
  const categories = [
    'fruits',
    'vegetables',
    'dairy',
    'meat',
    'beverages',
    'snacks',
    'cereals',
    'bread'
  ];
  
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  try {
    const response = await searchProducts(randomCategory, 1, count);
    return response.products.filter(product => 
      product.image_front_url && 
      (product.product_name || product.product_name_en)
    );
  } catch (error) {
    console.error('Error getting random products:', error);
    return [];
  }
}

export function getProductImageUrl(product: OpenFoodFactsProduct): string {
  return product.image_front_small_url || 
         product.image_front_url || 
         '/placeholder-food.svg';
}

// Prefer higher-quality image variants for detail views
export function getHighResProductImageUrl(product: OpenFoodFactsProduct): string {
  return (
    product.image_front_url ||
    // some products expose a generic image url
    product.image_url ||
    product.image_front_small_url ||
    '/placeholder-food.svg'
  );
}

export function getProductName(product: OpenFoodFactsProduct): string {
  return product.product_name_en || 
         product.product_name || 
         'Unknown Product';
}

export function formatNutritionInfo(product: OpenFoodFactsProduct): {
  energy?: string;
  fat?: string;
  carbohydrates?: string;
  proteins?: string;
  salt?: string;
  sugars?: string;
  fiber?: string;
} {
  if (!product.nutriments) return {};
  
  const n = product.nutriments;
  return {
    energy: n.energy_100g ? `${Math.round(n.energy_100g)} kJ` : undefined,
    fat: n.fat_100g ? `${n.fat_100g.toFixed(1)}g` : undefined,
    carbohydrates: n.carbohydrates_100g ? `${n.carbohydrates_100g.toFixed(1)}g` : undefined,
    proteins: n.proteins_100g ? `${n.proteins_100g.toFixed(1)}g` : undefined,
    salt: n.salt_100g ? `${n.salt_100g.toFixed(2)}g` : undefined,
    sugars: n.sugars_100g ? `${n.sugars_100g.toFixed(1)}g` : undefined,
    fiber: n.fiber_100g ? `${n.fiber_100g.toFixed(1)}g` : undefined,
  };
}
