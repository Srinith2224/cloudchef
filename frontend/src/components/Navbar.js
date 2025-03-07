import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext.js';
import './Navbar.css'; // Assuming you have a CSS file for styling

const Navbar = () => {
    const { user } = useRecipesContext();
    const [profilePhoto, setProfilePhoto] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await fetch(`/api/users/${user.userId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user info');
                }

                const userInfo = await response.json();
                setProfilePhoto(userInfo.profilePhoto);
            } catch (error) {
                console.error(error);
            }
        };

        if (user && user.userId) {
            fetchUserInfo();
        }
    }, [user]);

    const handleProfileClick = () => {
        navigate('/profile');
    };

    return (
        <header>
            <div className="container">
                <Link to={user ? "/welcome" : "/"} className="logo-container">
                    <img
                        src="/cloudcheflogo.png"
                        alt="Cloud Chef Logo"
                        className="logo"
                    />
                    <h1 className="logo-text">Cloud Chef</h1>
                </Link>
                {user && (
                    <div className="nav-links">
                        <Link to="/welcome" className="nav-link">
                            <span className="material-icons">home</span> 
                        </Link>
                        <Link to="/add-recipe" className="nav-link">
                            <span className="material-icons">add_box</span> 
                        </Link>
                        <Link to="/my-recipes" className="nav-link">
                            <span className="material-icons">library_books</span> 
                        </Link>
                        <Link to="/saved-recipes" className="nav-link">
                            <span className="material-icons">bookmark</span> 
                        </Link>
                        <Link to="/generate-recipe" className="nav-link">
                            <span className="material-icons">auto_awesome</span> 
                        </Link>
                        <Link to="/cart" className="nav-link">
                            <span className="material-icons">shopping_cart</span>
                        </Link>
                        <Link to="/scheduled-meals" className="nav-link">
                            <span className="material-icons">calendar_today</span>
                        </Link>
                        {profilePhoto ? (
            <Link to="/profile" className="nav-link">
              <img
                src={profilePhoto}
                alt="Profile"
                className="profile-photo"
                onClick={handleProfileClick}
              />
            </Link>
          ) : (
            <Link to="/profile" className="nav-link">
              <span onClick={handleProfileClick} className="material-icons profile-icon">account_circle</span>
            </Link>
          )}
        </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;