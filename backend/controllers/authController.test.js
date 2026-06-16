const { loginUser, registerUser, logoutUser, refreshToken } = require('./authController');
const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');

// Mock User model
jest.mock('../models/UserModel', () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: jest.fn(),
    })),
}));

const bcrypt = require('bcrypt');

describe('authController', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        process.env.SECRET = 'test_secret';
        process.env.REFRESH_SECRET = 'test_refresh_secret';
        jest.clearAllMocks();
    });

    describe('loginUser', () => {
        it('should return 400 if email or password is missing', async () => {
            req.body = { email: 'test@example.com' };
            await loginUser(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
        });

        it('should return 404 if user is not found', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(null);
            await loginUser(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
        });

        it('should return 401 if password is invalid', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };
            const mockUser = { email: 'test@example.com', password: 'hashed_password' };
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);
            await loginUser(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid password' });
        });

        it('should login successfully and return user data with token', async () => {
            const mockUser = {
                _id: 'user_id',
                email: 'test@example.com',
                password: 'hashed_password',
                firstName: 'John',
                lastName: 'Doe',
                role: 'user'
            };
            req.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock_token');

            await loginUser(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                email: mockUser.email,
                token: 'mock_token',
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                userId: mockUser._id,
                role: mockUser.role
            });
        });
    });

    describe('registerUser', () => {
        it('should return 400 if user already exists', async () => {
            req.body = { email: 'test@example.com', password: 'password123', firstName: 'John', lastName: 'Doe' };
            User.findOne.mockResolvedValue({ email: 'test@example.com' });
            await registerUser(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
        });

        it('should register successfully and return user data with token', async () => {
            const mockUser = {
                _id: 'user_id',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe'
            };
            req.body = { email: 'test@example.com', password: 'password123', firstName: 'John', lastName: 'Doe' };
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_password');
            User.create.mockResolvedValue(mockUser);
            jwt.sign.mockReturnValue('mock_token');

            await registerUser(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                email: mockUser.email,
                token: 'mock_token'
            });
        });
    });

    describe('logoutUser', () => {
        it('should return 200 and success message', () => {
            logoutUser(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
        });
    });

    describe('refreshToken', () => {
        it('should return 400 if refresh token is missing', async () => {
            await refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Refresh token required' });
        });

        it('should return 401 if refresh token is invalid', async () => {
            req.body = { refreshToken: 'invalid_token' };
            jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
            await refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
        });

        it('should return 200 and a new token if refresh token is valid', async () => {
            req.body = { refreshToken: 'valid_token' };
            jwt.verify.mockReturnValue({ _id: 'user_id' });
            User.findById.mockResolvedValue({ _id: 'user_id' });
            jwt.sign.mockReturnValue('new_access_token');

            await refreshToken(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ token: 'new_access_token' });
        });
    });
});
