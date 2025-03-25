
# CloudChef: A Cloud-Based Recipe Sharing and Cooking Management Platform  

## Overview  

CloudChef is a cloud-powered recipe-sharing and cooking management platform designed to enhance the culinary experience for home cooks, food enthusiasts, and professional chefs. It provides a collaborative space where users can discover, store, and share recipes while leveraging cloud-based services for high availability, performance, and scalability.  

The platform offers an intuitive user interface for managing personal recipe collections, interactive cooking sessions, and AI-driven ingredient recommendations. CloudChef supports multimedia content, including images and videos, to ensure a rich and engaging cooking experience.  

Built with a microservices architecture, CloudChef employs a scalable backend, a dynamic frontend, and a structured database to deliver a seamless experience. Its open-source nature allows developers and contributors to enhance the platform by adding new features and optimizing existing functionalities.  

---

## **Key Features**  

### **1. User Authentication and Authorization**  
- Secure access with multi-layered authentication mechanisms.  
- Users can register, log in, and manage their accounts with encrypted credentials.  
- OTP-based verification and Google authentication for secure and flexible access.  

### **2. Recipe Management**  
- Users can create, edit, and manage their own recipes with structured step-by-step instructions.  
- Supports embedded images and videos for an interactive cooking experience.  
- Recipes can be categorized and shared with the community.  

### **3. Saved Recipe Collection**  
- Users can save and access their favorite recipes in a personalized collection.  
- Provides quick retrieval of preferred meals for a hassle-free cooking experience.  

### **4. Calendar Integration for Meal Planning**  
- Allows users to plan daily, weekly, or monthly meals efficiently.  
- Integrated with a meal scheduler to organize cooking routines and ingredient management.  

### **5. Cart Functionality with Grocery Service Integration**  
- Users can add ingredients directly from a recipe to a shopping cart.  
- Seamless redirection to external grocery services for fast and easy purchasing.  

### **6. AI-Powered Recipe Generation**  
- Intelligent AI-driven system generates personalized recipe recommendations based on available ingredients.  
- Optimizes ingredient usage and reduces food wastage by suggesting creative cooking ideas.  

### **7. Rating and Review System**  
- Users can rate and review recipes based on their cooking experience.  
- Promotes community engagement and highlights top-rated recipes.  

### **8. Advanced Admin Functionalities**  
- Admins can manage users and recipes, ensuring content quality and compliance.  
- Includes moderation tools to monitor fraudulent activities and prevent spam.  

### **9. Interactive Cooking Guides**  
- Step-by-step guided cooking instructions with voice-enabled navigation.  
- Supports real-time progress tracking to help users follow recipes accurately.  

### **10. AI-Generated Nutritional Insights**  
- Provides real-time calorie and macronutrient breakdowns for each recipe.  
- Helps users track their dietary intake and make informed food choices.  


---

## **Technology Stack**  

### **Frontend**  
- React.js with Redux  
- Material-UI  
- React Router  
- Axios  

### **Backend**  
- Node.js with Express.js  
- MongoDB with Mongoose  
- JSON Web Token (JWT) for authentication  
- Cloudinary for media storage  

### **DevOps and Deployment**  
- Docker for containerization  
- Kubernetes for orchestration  
- Nginx as a reverse proxy  
- CI/CD pipeline with GitHub Actions  

---

## **Installation and Setup**  

### **Prerequisites**  
Ensure you have the following installed before setting up CloudChef:  
- Node.js (v16 or higher)  
- MongoDB (local or cloud instance)  
- Docker (optional, for containerized deployment)  
- Cloudinary account (for media uploads)  

### **Step 1: Clone the Repository**  
```sh
git clone https://github.com/your-username/cloudchef.git
cd cloudchef
```

---

## **Install Dependencies**  

### **Frontend Setup**  
Navigate to the frontend directory and install dependencies:  
```sh
cd frontend
npm install
```
Start the frontend development server:  
```sh
npm start
```
This will launch the application at:  
```
http://localhost:3000
```

---

### **Backend Setup**  
Navigate to the backend directory:  
```sh
cd backend
```
Uninstall the existing version of bcrypt:  
```sh
npm uninstall bcrypt
```
Install the specific version of bcrypt:  
```sh
npm install bcrypt@5.0.1
```
Fix any vulnerabilities:  
```sh
npm audit fix
```
Start the backend server:  
```sh
npm start
```

By default, the backend runs at:  
```
http://localhost:5000
```

---

## **Environment Variables Setup**  
Create a `.env` file in the backend directory and add the following values:  
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## **API Documentation**  

### **1. Authentication**  
#### **Register a new user**  
```http
POST /api/auth/register
```
**Body:**  
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "securepassword"
}
```

#### **Login**  
```http
POST /api/auth/login
```
**Body:**  
```json
{
  "email": "test@example.com",
  "password": "securepassword"
}
```

### **2. Recipe Endpoints**  
#### **Create a Recipe**  
```http
POST /api/recipes
```
**Body:**  
```json
{
  "title": "Chocolate Cake",
  "ingredients": ["Flour", "Sugar", "Cocoa Powder"],
  "instructions": ["Mix ingredients", "Bake at 180°C for 30 minutes"]
}
```

#### **Fetch All Recipes**  
```http
GET /api/recipes
```

#### **Fetch a Single Recipe**  
```http
GET /api/recipes/:id
```

---

6. **Submit a Pull Request**  

---

## **License**  

This project is licensed under the [MIT License](LICENSE).  

---

## **Acknowledgments**  

- Built with [React](https://reactjs.org/) and [Express](https://expressjs.com/).  
- Uses [Cloudinary](https://cloudinary.com/) for media uploads.  
- Inspired by the passion for cooking and sharing recipes.  

---


