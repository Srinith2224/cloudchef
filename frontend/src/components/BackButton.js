import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BackButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleBack = () => {
        if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/'); // Navigate to LandingPage
        } else if (location.pathname === '/cart') {
            navigate('/welcome'); // Navigate to Welcome page from Cart page
        } else if (location.pathname === '/savedrecipe') {
            navigate('/welcome'); // Navigate to Welcome page from SavedRecipe page
        } else if (location.pathname === '/myrecipes') {
            navigate('/welcome'); // Navigate to Welcome page from MyRecipes page
        } else if (location.pathname === '/profile') {
            navigate('/welcome'); // Navigate to Welcome page from Profile page
        } else if (location.pathname === '/generaterecipe') {
            navigate('/welcome'); // Navigate to Welcome page from Generaterecipe page
        } else {
            navigate(-1); // Navigate to the previous page
        }
    };

    return (
        <button onClick={handleBack} style={{ margin: '10px', padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Back
        </button>
    );
};

export default BackButton;
