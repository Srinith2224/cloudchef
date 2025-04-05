# CloudChef: A Recipe Sharing & Cooking Management Platform



## Overview

CloudChef is a modern, cloud-based platform that connects food enthusiasts, home cooks, and professional chefs. The application allows users to discover, create, and share recipes while providing powerful tools for meal planning, nutrition tracking, and ingredient management.

## ✨ Key Features

### User Management

- **Secure Authentication**: Email/password login, OTP verification, and Google OAuth
- **Profile Management**: Customizable user profiles with profile photos
- **Social Features**: Follow other users, view their recipes and activities

### Recipe Management

- **Rich Recipe Creation**: Create recipes with step-by-step instructions, images, and videos
- **Media Support**: Upload and store images and videos through Cloudinary integration
- **Recipe Collections**: Save favorite recipes to personal collections
- **Search & Discovery**: Explore recipes by ingredients, tags, or user

### Cooking Tools

- **Interactive Cooking Mode**: Step-by-step guided cooking experience
- **Nutrition Analysis**: AI-generated nutritional information for recipes
- **Meal Planning**: Calendar-based meal scheduling system
- **Shopping Lists**: Convert recipe ingredients to shopping cart items

### Administration

- **Admin Dashboard**: Manage users, recipes, and platform content
- **Content Moderation**: Tools to maintain quality and prevent abuse
- **User Management**: Control user roles and permissions

## 🛠️ Technology Stack

### Frontend

- **Framework**: React.js with functional components and hooks
- **State Management**: Context API with custom reducers
- **Routing**: React Router for navigation
- **Styling**: CSS with responsive design
- **HTTP Client**: Fetch API for data requests

### Backend

- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Media Storage**: Cloudinary for images and videos
- **APIs**: FatSecret API for nutrition data, Google OAuth for authentication

📸 Screenshots & Demo

UI Preview
![2025-03-26](https://github.com/user-attachments/assets/8ea989f3-f212-427b-944d-52a8f3d54e17)

![2025-03-20 (2)](https://github.com/user-attachments/assets/960b9481-4f93-43c8-89ab-af5f2b945ea6)




Video Demo


https://github.com/user-attachments/assets/fe16b489-8ed7-48f0-bdb1-8cdf8269d93f




## 📋 Installation Guide

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account
- FatSecret API credentials (for nutrition features)
- Google OAuth credentials (for Google sign-in)

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at: [http://localhost:3000](http://localhost:3000)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

#Uninstall the existing version of bcrypt:  
npm uninstall bcrypt

#Install the specific version of bcrypt:  
npm install bcrypt@5.0.1

#Fix any vulnerabilities:  
npm audit fix

#Start the backend server:  
npm start

```

The API server will run at: [http://localhost:4000](http://localhost:4000)

### Environment Configuration

Create a `.env` file in the backend directory with the following:

```
PORT=4000
MONGO_URI=your_mongodb_connection_string
SECRET=your_jwt_secret # run this command for generating jwt_secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# APIs
FATSECRET_KEY=your_fatsecret_key
FATSECRET_SECRET=your_fatsecret_secret
HUGGING_FACE_API_KEY=your_huggingface_api_key

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Email service (for OTP)
EMAIL_USER=your_email
EMAIL_PASSWORD=your_app_password
```

## 🔄 Data Migration

To migrate existing media files to Cloudinary:

```bash
cd backend
node scripts/migrateToCloudinary.js
```

## 🧹 File Management

The system includes automatic cleanup for unused media files:

```bash
npm run cleanup-images
```

## 📚 API Documentation

### Authentication

| Endpoint           | Method | Description               |
| ------------------ | ------ | ------------------------- |
| /api/auth/register | POST   | Register a new user       |
| /api/auth/login    | POST   | Login with credentials    |
| /api/otp/send      | POST   | Send OTP for verification |
| /api/otp/verify    | POST   | Verify OTP code           |

### Recipes

| Endpoint                   | Method | Description                 |
| -------------------------- | ------ | --------------------------- |
| /api/recipes               | GET    | Get all recipes             |
| /api/recipes/\:id          | GET    | Get a specific recipe       |
| /api/recipes               | POST   | Create a new recipe         |
| /api/recipes/\:id          | PATCH  | Update a recipe             |
| /api/recipes/\:id          | DELETE | Delete a recipe             |
| /api/recipes/search        | GET    | Search recipes              |
| /api/recipes/user/\:userId | GET    | Get user's recipes          |
| /api/recipes/save/\:id     | POST   | Save a recipe to collection |

### User Management

| Endpoint                       | Method | Description          |
| ------------------------------ | ------ | -------------------- |
| /api/users/\:id                | GET    | Get user profile     |
| /api/users/profile             | PATCH  | Update user profile  |
| /api/users/profile/photo       | POST   | Upload profile photo |
| /api/users/set-featured-recipe | POST   | Set featured recipe  |
| /api/users/\:id/followers      | GET    | Get user's followers |
| /api/users/\:id/following      | GET    | Get user's following |

### Cart & Calendar

| Endpoint         | Method | Description           |
| ---------------- | ------ | --------------------- |
| /api/cart        | GET    | Get cart items        |
| /api/cart/add    | POST   | Add item to cart      |
| /api/cart/delete | DELETE | Remove item from cart |
| /api/calendar    | GET    | Get scheduled meals   |
| /api/calendar    | POST   | Schedule a meal       |

### Admin

| Endpoint                   | Method | Description       |
| -------------------------- | ------ | ----------------- |
| /api/admin/users           | GET    | Get all users     |
| /api/admin/users/\:id/role | PATCH  | Update user role  |
| /api/admin/users/\:id      | DELETE | Delete a user     |
| /api/admin/recipes/\:id    | PATCH  | Update any recipe |
| /api/admin/recipes/\:id    | DELETE | Delete any recipe |

## 🔐 Admin Access

To create an admin user:

```bash
cd backend
node scripts/createAdmin.js
```

## 📝 License

This project is licensed under the GPL License.


