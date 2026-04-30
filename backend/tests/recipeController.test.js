jest.mock('../services/nutritionService', () => {
    return {
        getNutritionData: jest.fn()
    }
});
jest.mock('../models/RecipeModel', () => {});
jest.mock('mongoose', () => {});
jest.mock('../models/UserModel', () => {});
jest.mock('../config/cloudinaryConfig', () => { return { uploadRecipeImage: {} }});

const { calculateNutrition } = require('../controllers/recipeController');
const { getNutritionData } = require('../services/nutritionService');

describe('calculateNutrition', () => {
    beforeEach(() => {
        getNutritionData.mockReset();
    });

    it('should run fast and correctly with multiple ingredients', async () => {
        const ingredients = [];
        for (let i = 0; i < 100; i++) {
            ingredients.push({ name: `ingredient${i}`, quantity: 1, unit: 'cup' });
        }

        getNutritionData.mockImplementation(async () => {
            return new Promise(resolve => setTimeout(() => resolve({
                calories: 10, fat: 1, protein: 1, carbs: 1
            }), 10)); // 10ms per call
        });

        const req = {
            body: { ingredients }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        const start = Date.now();
        await calculateNutrition(req, res);
        const end = Date.now();

        console.log(`Time taken: ${end - start}ms`);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
