const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');

// FatSecret API credentials
const CONSUMER_KEY = process.env.FATSECRET_KEY;
const CONSUMER_SECRET = process.env.FATSECRET_SECRET;

// Create OAuth 1.0a instance
const oauth = OAuth({
  consumer: {
    key: CONSUMER_KEY,
    secret: CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  }
});

const getNutritionData = async (ingredient, quantity, unit) => {
  try {
    // Standardize the unit for FatSecret API
    const standardizedUnit = standardizeUnit(unit);
    
    // First, search for the ingredient
    const searchData = await searchFood(ingredient);
    
    if (searchData && searchData.foods && searchData.foods.food && searchData.foods.food.length > 0) {
      // Get the first result's ID
      const foodId = searchData.foods.food[0].food_id;
      
      // Get detailed nutrition information for this food
      const foodData = await getFoodDetails(foodId);
      
      if (foodData && foodData.food) {
        // Extract serving information
        const servings = foodData.food.servings;
        let serving;
        
        // Find the best matching serving size
        if (servings.serving) {
          if (Array.isArray(servings.serving)) {
            // Try to find a serving with matching unit
            serving = servings.serving.find(s => 
              s.serving_description && 
              s.serving_description.toLowerCase().includes(standardizedUnit)
            );
            
            // If no match, use the first serving
            if (!serving) {
              serving = servings.serving[0];
            }
          } else {
            serving = servings.serving;
          }
        }
        
        if (serving) {
          // Calculate nutrition based on quantity and serving
          const multiplier = calculateMultiplier(quantity, unit, serving);
          
          return {
            calories: Math.round(parseFloat(serving.calories) * multiplier) || 0,
            fat: Math.round(parseFloat(serving.fat) * multiplier) || 0,
            protein: Math.round(parseFloat(serving.protein) * multiplier) || 0,
            carbs: Math.round(parseFloat(serving.carbohydrate) * multiplier) || 0
          };
        }
      }
    }
    
    // If FatSecret didn't return usable data, fall back to our database
    return getFallbackNutrition(ingredient, quantity, unit);
    
  } catch (error) {
    console.error('Error fetching nutrition data from FatSecret API:', error);
    return getFallbackNutrition(ingredient, quantity, unit);
  }
};

// Helper function to search for a food item
const searchFood = async (query) => {
  const requestData = {
    url: 'https://platform.fatsecret.com/rest/server.api',
    method: 'GET'
  };
  
  // Request parameters
  const params = {
    method: 'foods.search',
    format: 'json',
    max_results: 1,
    search_expression: query
  };
  
  try {
    const authHeader = oauth.toHeader(oauth.authorize(requestData));
    
    const response = await axios({
      url: requestData.url,
      method: requestData.method,
      params: {
        ...params,
        oauth_consumer_key: CONSUMER_KEY,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000),
        oauth_nonce: Math.random().toString(36).substring(2),
        oauth_version: '1.0'
      },
      headers: {
        ...authHeader
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error searching for food:', error);
    throw error;
  }
};

// Helper function to get detailed food information
const getFoodDetails = async (foodId) => {
  const requestData = {
    url: 'https://platform.fatsecret.com/rest/server.api',
    method: 'GET'
  };
  
  // Request parameters
  const params = {
    method: 'food.get',
    food_id: foodId,
    format: 'json'
  };
  
  try {
    const authHeader = oauth.toHeader(oauth.authorize(requestData));
    
    const response = await axios({
      url: requestData.url,
      method: requestData.method,
      params: {
        ...params,
        oauth_consumer_key: CONSUMER_KEY,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000),
        oauth_nonce: Math.random().toString(36).substring(2),
        oauth_version: '1.0'
      },
      headers: {
        ...authHeader
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting food details:', error);
    throw error;
  }
};

// Helper function to standardize units for better matching
const standardizeUnit = (unit) => {
  if (!unit) return 'g'; // Default to grams if no unit provided
  
  const unitLower = unit.toLowerCase();
  
  // Map of common units and their standardized forms
  const unitMap = {
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz',
    'lb': 'lb',
    'pound': 'lb',
    'pounds': 'lb',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'l': 'l',
    'liter': 'l',
    'liters': 'l',
    'tbsp': 'tbsp',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tsp': 'tsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'cup': 'cup',
    'cups': 'cup'
  };
  
  return unitMap[unitLower] || unitLower;
};

// Helper to calculate multiplier based on quantity and unit
const calculateMultiplier = (quantity, unit, serving) => {
  // Default to 1 if no quantity provided
  const parsedQuantity = parseFloat(quantity) || 1;
  
  // Basic multiplier is just the quantity
  let multiplier = parsedQuantity;
  
  // If there's serving information, adjust multiplier
  if (serving.serving_description) {
    const description = serving.serving_description.toLowerCase();
    const metric = serving.metric_serving_amount;
    const unitStd = standardizeUnit(unit);
    
    // Adjust based on common units
    if (unitStd === 'g' && metric) {
      multiplier = parsedQuantity / metric;
    } else if (unitStd === 'kg') {
      multiplier = parsedQuantity * 1000 / metric;
    } else if (unitStd === 'oz' && metric) {
      multiplier = parsedQuantity * 28.35 / metric;
    } else if (unitStd === 'lb') {
      multiplier = parsedQuantity * 453.6 / metric;
    } else if (unitStd === 'cup' && description.includes('cup')) {
      // If serving is already in cups, direct comparison
      const servingCups = parseFloat(description) || 1;
      multiplier = parsedQuantity / servingCups;
    }
  }
  
  return multiplier;
};

// Fallback database for when API fails
const getFallbackNutrition = (ingredient, quantity, unit) => {
  const mockDatabase = {
    'rice': { calories: 130, fat: 0.3, protein: 2.7, carbs: 28 },
    'chicken': { calories: 165, fat: 3.6, protein: 31, carbs: 0 },
    'egg': { calories: 78, fat: 5.3, protein: 6.3, carbs: 0.6 },
    'milk': { calories: 42, fat: 1, protein: 3.4, carbs: 5 },
    'bread': { calories: 265, fat: 3.2, protein: 9, carbs: 49 },
    'pasta': { calories: 131, fat: 1.1, protein: 5, carbs: 25 },
    'butter': { calories: 717, fat: 81, protein: 0.9, carbs: 0.1 },
    'oil': { calories: 884, fat: 100, protein: 0, carbs: 0 },
    'sugar': { calories: 387, fat: 0, protein: 0, carbs: 100 },
    'flour': { calories: 364, fat: 1, protein: 10, carbs: 76 },
    'tomato': { calories: 18, fat: 0.2, protein: 0.9, carbs: 3.9 },
    'potato': { calories: 77, fat: 0.1, protein: 2, carbs: 17 },
    'onion': { calories: 40, fat: 0.1, protein: 1.1, carbs: 9.3 },
    'garlic': { calories: 149, fat: 0.5, protein: 6.4, carbs: 33 },
    'beef': { calories: 250, fat: 15, protein: 26, carbs: 0 },
    'pork': { calories: 242, fat: 14, protein: 27, carbs: 0 },
    'fish': { calories: 206, fat: 12, protein: 22, carbs: 0 },
    'carrot': { calories: 41, fat: 0.2, protein: 0.9, carbs: 10 },
    'broccoli': { calories: 34, fat: 0.4, protein: 2.8, carbs: 7 },
    'spinach': { calories: 23, fat: 0.4, protein: 2.9, carbs: 3.6 },
    'cheese': { calories: 402, fat: 33, protein: 25, carbs: 1.3 }
  };

  // Process ingredient name (case insensitive)
  const normalizedIngredient = ingredient.toLowerCase();
  let baseNutrition;

  // Try to find exact match
  if (mockDatabase[normalizedIngredient]) {
    baseNutrition = mockDatabase[normalizedIngredient];
  } else {
    // Try to find partial match
    const partialMatch = Object.keys(mockDatabase).find(key => 
      normalizedIngredient.includes(key) || key.includes(normalizedIngredient)
    );
    
    if (partialMatch) {
      baseNutrition = mockDatabase[partialMatch];
    } else {
      // Default values if no match found
      baseNutrition = { calories: 100, fat: 2, protein: 2, carbs: 15 };
    }
  }
  
  // Calculate based on quantity
  let multiplier = parseFloat(quantity) || 1;
  
  // Adjust multiplier based on unit
  if (unit === 'kg' || unit === 'l') {
    multiplier *= 10;
  } else if (unit === 'tbsp') {
    multiplier *= 0.15;
  } else if (unit === 'tsp') {
    multiplier *= 0.05;
  } else if (unit === 'cup') {
    multiplier *= 1.5;
  }
  
  return {
    calories: Math.round(baseNutrition.calories * multiplier) || 0,
    fat: Math.round(baseNutrition.fat * multiplier) || 0,
    protein: Math.round(baseNutrition.protein * multiplier) || 0,
    carbs: Math.round(baseNutrition.carbs * multiplier) || 0
  };
};

module.exports = { getNutritionData };