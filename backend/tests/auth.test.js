jest.mock('../models/UserModel', () => ({ findOne: jest.fn(), create: jest.fn(), findById: jest.fn() }));
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(() => 'mock_token'), verify: jest.fn() }));
jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: jest.fn() })) }));

const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const { loginUser, logoutUser, getGoogleClientId, checkPassword } = require('../controllers/authController');

const user = { _id: 'user_id', email: 'test@example.com', password: 'hashed', firstName: 'John', lastName: 'Doe', role: 'user' };
const session = { token: 'mock_token', userId: 'user_id', email: 'test@example.com', firstName: 'John', lastName: 'Doe', profilePhoto: '', role: 'user' };

/** Runs a handler like Express would. Errors passed to next() come back as `error`. */
const call = async (handler, req) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  let error;
  await handler(req, res, (err) => { error = err; });
  return { res, error };
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SECRET = 'test_secret';
});

describe('loginUser', () => {
  it('asks for both fields', async () => {
    const { error } = await call(loginUser, { body: { email: 'test@example.com' } });
    expect(error.status).toBe(400);
  });

  it('gives the same answer for unknown email and wrong password', async () => {
    User.findOne.mockResolvedValue(null);
    const first = await call(loginUser, { body: { email: 'x@example.com', password: 'whatever1' } });

    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);
    const second = await call(loginUser, { body: { email: 'test@example.com', password: 'wrongpass' } });

    expect(first.error.status).toBe(401);
    expect(second.error.status).toBe(401);
    expect(first.error.message).toBe(second.error.message);
  });

  it('normalises the email and returns a full session', async () => {
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    const { res, error } = await call(loginUser, { body: { email: '  Test@Example.com ', password: 'password123' } });
    expect(error).toBeUndefined();
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(session);
  });
});

describe('checkPassword', () => {
  it('rejects short passwords', () => expect(() => checkPassword('short')).toThrow('at least 8'));
  it('accepts 8 or more characters', () => expect(() => checkPassword('password123')).not.toThrow());
});

describe('small endpoints', () => {
  it('logout returns 200', async () => {
    const { res } = await call(logoutUser, {});
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('google client id is null when not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const { res } = await call(getGoogleClientId, {});
    expect(res.json).toHaveBeenCalledWith({ clientId: null });
  });
});
