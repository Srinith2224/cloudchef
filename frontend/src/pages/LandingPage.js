import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import { motion } from 'framer-motion';

const LandingPage = () => {
  // Add this to prevent scrolling on landing page
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  return (
    <div className="landing-page">
      <div className="background-animation"></div>
      <div className="floating-particles"></div>
      
      <motion.div 
        className="hero-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="logo-animation">
          <div className="logo-background"></div>
          <motion.img 
            src="/cloudcheflogo.png" 
            alt="Cloud Chef Logo"
            animate={{
              y: [0, -10, 0],
              rotate: [0, -3, 0, 3, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        </div>
        
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Cloud Chef
        </motion.h1>
        
        <motion.div
          className="tagline-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h2>Cooking made <span className="accent">easy</span> and <span className="accent">enjoyable</span></h2>
          <p>Discover, create, and share amazing recipes with our intuitive recipe management platform.</p>
        </motion.div>
        
        <motion.div 
          className="feature-highlights"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <div className="feature">
            <span className="material-icons">search</span>
            <span>Discover Recipes</span>
          </div>
          <div className="feature">
            <span className="material-icons">edit</span>
            <span>Create Your Own</span>
          </div>
          <div className="feature">
            <span className="material-icons">share</span>
            <span>Share with Others</span>
          </div>
          <div className="feature">
            <span className="material-icons">star</span>
            <span>Save Favorites</span>
          </div>
        </motion.div>
        
        <motion.div 
          className="auth-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <Link to="/welcome" className="browse-btn">
            <span className="material-icons">restaurant_menu</span>
            Browse Recipes
          </Link>
          <Link to="/auth" className="join-btn">
            <span className="material-icons">person_add</span>
            Join the Feast
          </Link>
        </motion.div>
      </motion.div>
      
      <div className="chef-hat-decoration top-left"></div>
      <div className="chef-hat-decoration bottom-right"></div>
      <div className="chef-hat-decoration center-right"></div>
    </div>
  );
};

export default LandingPage;
