jest.mock('../models/UserModel', () => ({ findOne: jest.fn(), create: jest.fn(), findById: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(() => 'mock_token'), verify: jest.fn() }));
jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: jest.fn() })) }));

const User = require('../models/UserModel');
const bcrypt = require('bcrypt');
const { loginUser, registerUser, logoutUser, getGoogleClientId } = require('../controllers/authController');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
const user = { _id: 'user_id', email: 'test@example.com', password: 'hashed', firstName: 'John', lastName: 'Doe', role: 'user' };
const session = { token: 'mock_token', userId: 'user_id', email: 'test@example.com', firstName: 'John', lastName: 'Doe', profilePhoto: '', role: 'user' };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SECRET = 'test_secret';
});

describe('loginUser', () => {
  it('asks for both fields', async () => {
    const res = mockRes();
    await loginUser({ body: { email: 'test@example.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('gives the same answer for unknown email and wrong password', async () => {
    const res1 = mockRes();
    User.findOne.mockResolvedValue(null);
    await loginUser({ body: { email: 'x@example.com', password: 'whatever1' } }, res1);

    const res2 = mockRes();
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);
    await loginUser({ body: { email: 'test@example.com', password: 'wrongpass' } }, res2);

    expect(res1.status).toHaveBeenCalledWith(401);
    expect(res2.status).toHaveBeenCalledWith(401);
    expect(res1.json.mock.calls[0][0]).toEqual(res2.json.mock.calls[0][0]);
  });

  it('normalises the email and returns a full session', async () => {
    const res = mockRes();
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    await loginUser({ body: { email: '  Test@Example.com ', password: 'password123' } }, res);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(session);
  });
});

describe('registerUser', () => {
  const body = { email: 'test@example.com', password: 'password123', firstName: 'John', lastName: 'Doe' };

  it('rejects short passwords', async () => {
    const res = mockRes();
    await registerUser({ body: { ...body, password: 'short' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects existing emails', async () => {
    const res = mockRes();
    User.findOne.mockResolvedValue(user);
    await registerUser({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates the account with a hashed password', async () => {
    const res = mockRes();
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed');
    User.create.mockResolvedValue(user);
    await registerUser({ body }, res);
    expect(User.create).toHaveBeenCalledWith({ firstName: 'John', lastName: 'Doe', email: 'test@example.com', password: 'hashed' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(session);
  });
});

describe('small endpoints', () => {
  it('logout returns 200', () => {
    const res = mockRes();
    logoutUser({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('google client id is null when not configured', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const res = mockRes();
    getGoogleClientId({}, res);
    expect(res.json).toHaveBeenCalledWith({ clientId: null });
  });
});
