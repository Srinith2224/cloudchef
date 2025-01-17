import React from 'react';
import { Link } from 'react-router-dom';
import Lottie from 'lottie-react';
import animationData from '../assets/cooking-background.json'; 
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            <div className="background-animation">
                <Lottie 
                    animationData={animationData}
                    loop={true}
                    autoplay={true}
                />
            </div>
            <div className="hero-section">
                <h1>Welcome to Cloud Chef</h1>
                <h2>Discover Easy and Smart Recipes</h2>
                <p>
                    Spend less time in the kitchen and more time enjoying your meals. With Cloud Chef, you'll never repeat the same meal every day.
                </p>
                <p>
                    So, shall we cook something amazing today?
                </p>
                <div className="auth-buttons">
                    <Link to="/register">Register</Link>
                    <Link to="/login">Login</Link>
                </div>
            </div>
        </div>
    );
};
export default LandingPage; 