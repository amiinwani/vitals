'use client';

import React from 'react';
import { X, ExternalLink, Store, Tag, DollarSign, Zap, Package } from 'lucide-react';
import { cn, formatPrice, formatWeight, getNutritionValue } from '@/lib/utils';
import { TrueFoodProduct } from '@/lib/truefood-data';
import { OpenFoodFactsProduct, formatNutritionInfo } from '@/lib/openfoodfacts';

interface FoodDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  foodData: {
    name: string;
    image?: string;
    product?: OpenFoodFactsProduct | TrueFoodProduct;
    darkMode?: boolean;
  } | null;
}

export function FoodDetailsDialog({ isOpen, onClose, foodData }: FoodDetailsDialogProps) {
  if (!isOpen || !foodData) return null;

  const isTrueFoodProduct = 'original_ID' in (foodData.product || {});
  const trueFoodProduct = isTrueFoodProduct ? foodData.product as TrueFoodProduct : null;
  const openFoodProduct = !isTrueFoodProduct ? foodData.product as OpenFoodFactsProduct : null;

  const getNutriScoreStyle = (grade?: string) => {
    const g = (grade || '').toLowerCase();
    switch (g) {
      case 'a': return { border: 'border-green-400', bg: 'bg-green-100', text: 'text-green-800' };
      case 'b': return { border: 'border-green-300', bg: 'bg-green-100', text: 'text-green-700' };
      case 'c': return { border: 'border-yellow-300', bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'd': return { border: 'border-orange-300', bg: 'bg-orange-100', text: 'text-orange-800' };
      case 'e': return { border: 'border-red-400', bg: 'bg-red-100', text: 'text-red-800' };
      default: return { border: 'border-gray-200', bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

  const nutriScore = isTrueFoodProduct ? 
    (trueFoodProduct?.f_FPro_class || 'N/A') : 
    (openFoodProduct?.nutrition_grades || 'N/A');
  
  const nutriStyle = getNutriScoreStyle(nutriScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={cn(
        "relative mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl",
        foodData.darkMode ? "bg-neutral-900 text-gray-100" : "bg-white text-gray-800"
      )}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute -top-3 -right-3 w-8 h-8 rounded-full shadow-lg border z-10",
            foodData.darkMode 
              ? "bg-neutral-800 text-gray-300 hover:text-white border-neutral-700" 
              : "bg-white text-gray-600 hover:text-gray-900 border-gray-200"
          )}
          aria-label="Close"
        >
          <X className="w-4 h-4 mx-auto" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex gap-6 mb-6">
            {/* Image */}
            <div className={cn(
              "w-48 h-48 rounded-xl overflow-hidden border flex-shrink-0",
              foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
            )}>
              <img
                src={foodData.image || '/placeholder-food.svg'}
                alt={foodData.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-food.svg';
                }}
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-3 leading-tight">{foodData.name}</h2>
              
              {/* Nutri-Score */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-medium text-gray-600">Nutri-Score:</span>
                <div className={cn(
                  "px-3 py-1 rounded-full text-sm font-bold border",
                  nutriStyle.border, nutriStyle.bg, nutriStyle.text
                )}>
                  {nutriScore.toUpperCase()}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                {trueFoodProduct && (
                  <>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{trueFoodProduct.store}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{trueFoodProduct.harmonized_single_category}</span>
                    </div>
                    {trueFoodProduct.price > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{formatPrice(trueFoodProduct.price)}</span>
                      </div>
                    )}
                    {trueFoodProduct.package_weight && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{formatWeight(trueFoodProduct.package_weight)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {openFoodProduct && (
                  <>
                    {openFoodProduct.brands && (
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{openFoodProduct.brands}</span>
                      </div>
                    )}
                    {openFoodProduct.categories && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{openFoodProduct.categories.split(',').slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                    {openFoodProduct.quantity && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{openFoodProduct.quantity}</span>
                      </div>
                    )}
                    {openFoodProduct.countries && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌍 {openFoodProduct.countries.split(',').slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Nutrition Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Nutrition Information (per 100g)
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {trueFoodProduct ? (
                <>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Protein</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Protein)}g</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Total Fat</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Total_Fat)}g</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Carbohydrates</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Carbohydrate)}g</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Sugars</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Sugars_total)}g</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Fiber</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Fiber_total_dietary)}g</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Sodium</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Sodium)}mg</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Calcium</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Calcium)}mg</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Iron</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Iron)}mg</div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-sm text-gray-600 mb-1">Cholesterol</div>
                    <div className="font-semibold">{getNutritionValue(trueFoodProduct.Cholesterol)}mg</div>
                  </div>
                </>
              ) : openFoodProduct?.nutriments ? (
                Object.entries(formatNutritionInfo(openFoodProduct)).map(([key, value]) => 
                  value && (
                    <div key={key} className={cn(
                      "p-3 rounded-lg border",
                      foodData.darkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-200"
                    )}>
                      <div className="text-sm text-gray-600 mb-1 capitalize">{key}</div>
                      <div className="font-semibold">{value as string}</div>
                    </div>
                  )
                )
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">
                  No nutrition information available
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {(trueFoodProduct || openFoodProduct) && (
            <div className="space-y-4">
              {/* Brand */}
              {(trueFoodProduct?.brand || openFoodProduct?.brands) && (
                <div>
                  <h4 className="font-semibold mb-2">Brand</h4>
                  <p className="text-sm text-gray-600">
                    {trueFoodProduct?.brand || openFoodProduct?.brands}
                  </p>
                </div>
              )}

              {/* Ingredients */}
              {openFoodProduct?.ingredients_text && (
                <div>
                  <h4 className="font-semibold mb-2">Ingredients</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {openFoodProduct.ingredients_text}
                  </p>
                </div>
              )}

              {/* Allergens */}
              {openFoodProduct?.allergens && (
                <div>
                  <h4 className="font-semibold mb-2">Allergens</h4>
                  <p className="text-sm text-gray-600">{openFoodProduct.allergens}</p>
                </div>
              )}

              {/* TrueFood Specific Info */}
              {trueFoodProduct && (
                <>
                  {trueFoodProduct.f_FPro > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Food Processing Score</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(trueFoodProduct.f_FPro / 1) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{(trueFoodProduct.f_FPro * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Lower score = less processed
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

                        {/* External Links */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex gap-3">
                  {trueFoodProduct?.product_url && (
                    <a
                      href={trueFoodProduct.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on TrueFood
                    </a>
                  )}
                  {openFoodProduct?.code && (
                    <a
                      href={`https://world.openfoodfacts.org/product/${openFoodProduct.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on OpenFoodFacts
                    </a>
                  )}
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}
