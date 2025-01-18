import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './Navbar.css'; // Assuming you have a CSS file for styling

const Navbar = () => {
    const { user } = useRecipesContext();
    const [profilePhoto, setProfilePhoto] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserInfo = async () => {
            if (user) {
                try {
                    const response = await fetch(`/api/users/${user.userId}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    const data = await response.json();
                    if (response.ok) {
                        setProfilePhoto(data.profilePhoto);
                    } else {
                        console.error('Failed to fetch user info:', data.message);
                    }
                } catch (error) {
                    console.error('Error fetching user info:', error);
                }
            }
        };

        fetchUserInfo();
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
                        <Link to="/welcome" className="nav-link">Home</Link>
                        <Link to="/add-recipe" className="nav-link">Add Recipes</Link>
                        <Link to="/my-recipes" className="nav-link">My Recipes</Link>
                        <Link to="/saved-recipes" className="nav-link">Saved Recipes</Link>
                        <Link to="/generate-recipe" className="nav-link">Generate Recipe</Link>
                        <Link to="/cart" className="cart-link">
                            <span className="material-icons">shopping_cart</span>
                        </Link>
                        {profilePhoto ? (
                            <img
                                src={profilePhoto}
                                alt="Profile"
                                className="profile-photo"
                                onClick={handleProfileClick}
                            />
                        ) : (
                            <span onClick={handleProfileClick} className="profile-icon">My Profile</span>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;