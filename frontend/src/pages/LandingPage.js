import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  useEffect(() => {
    // Add class to body to disable scrolling
    document.body.classList.add('no-scroll');

    // Cleanup function to remove class when component unmounts
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);
  return (
    <div className="landing-page">
      <div className="background-animation"></div>
      <img 
        src="/cloudcheflogo.png" 
        alt="Cloud Chef Logo" 
        className="logo-animation" 
      />
      <div className="hero-section">
        <h1>Welcome to CloudChef</h1>
        <h2>Create, Cook, and Celebrate</h2>
        <p>
          Transform your kitchen into a gourmet paradise. With Cloud Chef, every meal is a new experience crafted just for you.
        </p>
        <p>
          Ready to embark on a delicious journey? Let’s create something extraordinary together!
        </p>
        <div className="auth-buttons">
          <Link to="/auth">Join the Feast</Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
