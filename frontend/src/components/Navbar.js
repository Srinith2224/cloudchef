import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './Navbar.css'; // Import the CSS file for Navbar

const Navbar = () => {
    const { user } = useRecipesContext();
    const navigate = useNavigate();
    const [profilePhoto, setProfilePhoto] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!user || !user.userId) return;

            try {
                const response = await fetch(`/api/users/${user.userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    setProfilePhoto(data.profilePhoto ? `http://localhost:4000${data.profilePhoto}` : null);
                } else {
                    console.error('Failed to fetch user information:', data.error);
                }
            } catch (error) {
                console.error('Error fetching user information:', error);
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
                        <Link to="/cart" className="cart-link" style={{ marginRight: '30px' }}>
                            <span className="material-icons">shopping_cart</span>
                        </Link>
                        
                        {profilePhoto ? (
                            <img
                                src={profilePhoto}
                                alt="Profile"
                                className="profile-photo"
                                onClick={handleProfileClick}
                                style={{ cursor: 'pointer' }}
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