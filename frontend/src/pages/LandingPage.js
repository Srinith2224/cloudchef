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
                <h1>Create, Cook, and Celebrate</h1>
                <h2>Embark on a Culinary Journey with Cloud Chef</h2>
                <p>
                    Transform your kitchen into a gourmet paradise. With Cloud Chef, every meal is a new experience, crafted just for you.
                </p>
                <p>
                    Ready to embark on a delicious journey? Let's create something extraordinary together!
                </p>
                <div className="auth-buttons">
                    <Link to="/auth">Join the Feast</Link>
                </div>
            </div>
        </div>
    );
};
export default LandingPage;