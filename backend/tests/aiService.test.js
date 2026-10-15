const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn().mockImplementation(() => ({ models: { generateContent: mockGenerateContent } })) }));

process.env.GEMINI_API_KEY = 'test-key';
const { generateFromText, generateFromImage } = require('../services/aiRecipeService');

const sample = JSON.stringify({
  title: 'Tomato egg bhurji', description: 'Quick scramble', servings: 2,
  totalTime: { hours: 0, minutes: 15 },
  ingredients: [{ name: 'Egg', quantity: '4', unit: 'piece' }],
  steps: [{ text: 'Scramble the eggs', timer: 5 }], tags: ['Indian'], tips: []
});

beforeEach(() => mockGenerateContent.mockReset());

it('sends a JSON request for text recipes and parses the answer', async () => {
  mockGenerateContent.mockResolvedValue({ text: sample });
  const recipe = await generateFromText({ ingredients: ['egg', 'tomato'], servings: 2 });
  const call = mockGenerateContent.mock.calls[0][0];
  expect(call.config.responseMimeType).toBe('application/json');
  expect(call.contents).toContain('egg, tomato');
  expect(recipe.title).toBe('Tomato egg bhurji');
});

it('sends the photo as inline base64 data', async () => {
  mockGenerateContent.mockResolvedValue({ text: '```json\n' + sample + '\n```' });
  await generateFromImage({ servings: 2 }, { mimetype: 'image/jpeg', buffer: Buffer.from('img') });
  const parts = mockGenerateContent.mock.calls[0][0].contents[0].parts;
  expect(parts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: Buffer.from('img').toString('base64') });
});
