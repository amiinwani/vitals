import Papa from 'papaparse';

export interface TrueFoodProduct {
  original_ID: string;
  name: string;
  store: string;
  harmonized_single_category: string;
  brand: string;
  f_FPro: number;
  f_FPro_P: number;
  f_min_FPro: number;
  f_std_FPro: number;
  f_FPro_class: string;
  price: number;
  price_percal: number;
  package_weight: string;
  has10_nuts: number;
  is_Nuts_Converted_100g: number;
  Protein: number;
  Total_Fat: number;
  Carbohydrate: number;
  Sugars_total: number;
  Fiber_total_dietary: number;
  Calcium: number;
  Iron: number;
  Sodium: number;
  Vitamin_C: number;
  Cholesterol: number;
  Fatty_acids_total_saturated: number;
  Total_Vitamin_A: number;
  product_url: string;
  image_url: string;
}

export interface FilterOptions {
  stores: string[];
  categories: string[];
  priceRange: [number, number];
  nutritionFilters: {
    protein: [number, number];
    fat: [number, number];
    carbs: [number, number];
    sugar: [number, number];
    fiber: [number, number];
    sodium: [number, number];
  };
  searchQuery: string;
}

// Hardcoded categories for Explore mode (41 categories)
export const EXPLORE_CATEGORIES = [
  'Pizza', 'Mac & Cheese', 'Bread', 'Chips', 'Ice Cream & Dessert', 
  'Chocolate & Candy', 'Cakes', 'Bars', 'Popcorn', 'Packaged Rice & Grains',
  'Meat & Meat Alternatives', 'Breakfast', 'Tea Related', 'Shakes & Other Drinks',
  'Jerky', 'Crackers & Mixed Snacks', 'Yogurt Products', 'Packaged Produce & Beans',
  'Nuts & Seeds Snacks', 'Soft Drinks', 'Cookies & Biscuit', 'Coffee Related',
  'Pudding & Jell-O', 'Soup Stew Broth', 'Cheese', 'Baking', 'Pasta',
  'Sauce All Kind', 'Juice', 'Spread & Squeeze', 'Salad', 'Milk & Milk Substitute',
  'Dressings', 'Baby Food', 'Dips & Salsa', 'Cereal', 'Seafood', 'Sausage-Bacon',
  'Prepared Meals & Dishes', 'Muffins & Bagels', 'Wraps', 'Target', 'Walmart', 'WholeFoods'
];

// Available stores
export const AVAILABLE_STORES = ['Target', 'Walmart', 'WholeFoods'];

// Nutrition ranges for filtering
export const NUTRITION_RANGES = {
  protein: [0, 50],
  fat: [0, 100],
  carbs: [0, 100],
  sugar: [0, 100],
  fiber: [0, 50],
  sodium: [0, 5000]
};

class TrueFoodDataManager {
  private products: TrueFoodProduct[] = [];
  private categories: Set<string> = new Set();
  private stores: Set<string> = new Set();
  private isLoaded = false;

  async loadData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const response = await fetch('/truefood_products_full.csv');
      const csvText = await response.text();
      
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value, field) => {
          // Convert numeric fields
          const numericFields = ['f_FPro', 'f_FPro_P', 'f_min_FPro', 'f_std_FPro', 'price', 'price_percal', 
                                'has10_nuts', 'is_Nuts_Converted_100g', 'Protein', 'Total_Fat', 'Carbohydrate', 
                                'Sugars_total', 'Fiber_total_dietary', 'Calcium', 'Iron', 'Sodium', 'Vitamin_C', 
                                'Cholesterol', 'Fatty_acids_total_saturated', 'Total_Vitamin_A'];
          
          if (numericFields.includes(field as string)) {
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
          }
          return value;
        }
      });

      this.products = result.data as TrueFoodProduct[];
      
      // Extract unique categories and stores
      this.products.forEach(product => {
        if (product.harmonized_single_category) {
          this.categories.add(product.harmonized_single_category);
        }
        if (product.store) {
          this.stores.add(product.store);
        }
      });

      this.isLoaded = true;
    } catch (error) {
      console.error('Error loading TrueFood data:', error);
      throw error;
    }
  }

  getProducts(filters: Partial<FilterOptions> = {}): TrueFoodProduct[] {
    let filteredProducts = [...this.products];

    // Apply store filter
    if (filters.stores && filters.stores.length > 0) {
      filteredProducts = filteredProducts.filter(product => 
        filters.stores!.includes(product.store)
      );
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      filteredProducts = filteredProducts.filter(product => 
        filters.categories!.includes(product.harmonized_single_category)
      );
    }

    // Apply price range filter
    if (filters.priceRange) {
      filteredProducts = filteredProducts.filter(product => 
        product.price >= filters.priceRange![0] && product.price <= filters.priceRange![1]
      );
    }

    // Apply nutrition filters
    if (filters.nutritionFilters) {
      const nutrition = filters.nutritionFilters;
      
      if (nutrition.protein) {
        filteredProducts = filteredProducts.filter(product => 
          product.Protein >= nutrition.protein![0] && product.Protein <= nutrition.protein![1]
        );
      }
      
      if (nutrition.fat) {
        filteredProducts = filteredProducts.filter(product => 
          product.Total_Fat >= nutrition.fat![0] && product.Total_Fat <= nutrition.fat![1]
        );
      }
      
      if (nutrition.carbs) {
        filteredProducts = filteredProducts.filter(product => 
          product.Carbohydrate >= nutrition.carbs![0] && product.Carbohydrate <= nutrition.carbs![1]
        );
      }
      
      if (nutrition.sugar) {
        filteredProducts = filteredProducts.filter(product => 
          product.Sugars_total >= nutrition.sugar![0] && product.Sugars_total <= nutrition.sugar![1]
        );
      }
      
      if (nutrition.fiber) {
        filteredProducts = filteredProducts.filter(product => 
          product.Fiber_total_dietary >= nutrition.fiber![0] && product.Fiber_total_dietary <= nutrition.fiber![1]
        );
      }
      
      if (nutrition.sodium) {
        filteredProducts = filteredProducts.filter(product => 
          product.Sodium >= nutrition.sodium![0] && product.Sodium <= nutrition.sodium![1]
        );
      }
    }

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.harmonized_single_category.toLowerCase().includes(query)
      );
    }

    return filteredProducts;
  }

  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  getStores(): string[] {
    return Array.from(this.stores).sort();
  }

  getProductById(id: string): TrueFoodProduct | undefined {
    return this.products.find(product => product.original_ID === id);
  }

  getProductsByCategory(category: string): TrueFoodProduct[] {
    return this.products.filter(product => product.harmonized_single_category === category);
  }

  getProductsByStore(store: string): TrueFoodProduct[] {
    return this.products.filter(product => product.store === store);
  }

  getNutritionStats(): {
    protein: [number, number];
    fat: [number, number];
    carbs: [number, number];
    sugar: [number, number];
    fiber: [number, number];
    sodium: [number, number];
  } {
    const stats = {
      protein: [0, 0] as [number, number],
      fat: [0, 0] as [number, number],
      carbs: [0, 0] as [number, number],
      sugar: [0, 0] as [number, number],
      fiber: [0, 0] as [number, number],
      sodium: [0, 0] as [number, number]
    };

    if (this.products.length === 0) return stats;

    const proteinValues = this.products.map(p => p.Protein).filter(v => v > 0);
    const fatValues = this.products.map(p => p.Total_Fat).filter(v => v > 0);
    const carbsValues = this.products.map(p => p.Carbohydrate).filter(v => v > 0);
    const sugarValues = this.products.map(p => p.Sugars_total).filter(v => v > 0);
    const fiberValues = this.products.map(p => p.Fiber_total_dietary).filter(v => v > 0);
    const sodiumValues = this.products.map(p => p.Sodium).filter(v => v > 0);

    if (proteinValues.length > 0) {
      stats.protein = [Math.min(...proteinValues), Math.max(...proteinValues)];
    }
    if (fatValues.length > 0) {
      stats.fat = [Math.min(...fatValues), Math.max(...fatValues)];
    }
    if (carbsValues.length > 0) {
      stats.carbs = [Math.min(...carbsValues), Math.max(...carbsValues)];
    }
    if (sugarValues.length > 0) {
      stats.sugar = [Math.min(...sugarValues), Math.max(...sugarValues)];
    }
    if (fiberValues.length > 0) {
      stats.fiber = [Math.min(...fiberValues), Math.max(...fiberValues)];
    }
    if (sodiumValues.length > 0) {
      stats.sodium = [Math.min(...sodiumValues), Math.max(...sodiumValues)];
    }

    return stats;
  }

  getPriceRange(): [number, number] {
    if (this.products.length === 0) return [0, 0];
    const prices = this.products.map(p => p.price).filter(p => p > 0);
    return [Math.min(...prices), Math.max(...prices)];
  }
}

export const trueFoodDataManager = new TrueFoodDataManager();