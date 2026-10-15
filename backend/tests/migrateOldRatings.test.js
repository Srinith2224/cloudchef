const mockRecipes = [];
const mockInserted = [];
const mockUnset = [];

jest.mock('../models/RecipeModel', () => ({
  collection: {
    find: () => ({ project: () => ({ toArray: async () => mockRecipes }) }),
    updateOne: async (filter, update) => mockUnset.push([filter, update])
  }
}));
jest.mock('../models/RatingModel', () => ({
  exists: async ({ recipeId, userId }) => mockInserted.some((r) => r.recipeId === recipeId && r.userId === userId),
  collection: { insertOne: async (doc) => mockInserted.push(doc) }
}));
jest.mock('../models/UserModel', () => ({
  findById: () => ({ select: async () => ({ firstName: 'Asha', lastName: 'Rao' }) })
}));
jest.mock('../controllers/ratingController', () => ({ refreshRecipeRating: jest.fn(async () => ({})) }));

const { refreshRecipeRating } = require('../controllers/ratingController');
const migrateOldRatings = require('../utils/migrateOldRatings');

it('moves old embedded ratings once and removes them from the recipe', async () => {
  const when = new Date('2024-01-05');
  mockRecipes.push({
    _id: 'r1',
    createdBy: { _id: 'author' },
    ratings: [
      { userId: 'u1', rating: 4, comment: 'Lovely', createdAt: when },
      { userId: 'u1', rating: 5 }, // same person twice: keep the first
      { userId: 'author', rating: 5 }, // own recipe: skipped
      { userId: 'u2', rating: 9 }, // invalid: skipped
      { rating: 3 } // no user: skipped
    ]
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});

  await migrateOldRatings();

  expect(mockInserted).toEqual([{
    recipeId: 'r1', userId: 'u1', userName: 'Asha Rao', rating: 4, comment: 'Lovely', createdAt: when, updatedAt: when
  }]);
  expect(refreshRecipeRating).toHaveBeenCalledWith('r1');
  expect(mockUnset).toEqual([[{ _id: 'r1' }, { $unset: { ratings: '' } }]]);
});
