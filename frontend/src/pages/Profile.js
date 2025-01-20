import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './Profile.css'; // Import the CSS file for styling

const Profile = () => {
    const { user, dispatch } = useRecipesContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [about, setAbout] = useState('');
    const [region, setRegion] = useState('');
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState('profile'); // State to track active section
    const [showLogoutSuccessModal, setShowLogoutSuccessModal] = useState(false); // State for logout success modal
    const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false); // State for update success modal

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await fetch(`/api/users/${user.userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    setEmail(data.email);
                    setProfilePhoto(data.profilePhoto ? `http://localhost:4000${data.profilePhoto}` : null);
                    setAbout(data.about);
                    setRegion(data.region);
                } else {
                    setError(data.error);
                }
            } catch (error) {
                setError('Failed to fetch user information');
            }
        };

        if (user && user.userId) {
            fetchUserInfo();
        }
    }, [user]);

    const handleLogout = () => {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(response => {
            if (response.ok) {
                dispatch({ type: 'LOGOUT' });
                localStorage.removeItem('token');
                navigate('/auth'); // Navigate to Auth page
                setShowLogoutSuccessModal(true); // Show the logout success modal
            } else {
                console.error('Failed to log out');
            }
        }).catch(error => {
            console.error('Error logging out:', error);
        });
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('email', email);
        if (password) formData.append('password', password);
        if (profilePhoto instanceof File) formData.append('profilePhoto', profilePhoto);
        formData.append('about', about);
        formData.append('region', region);

        try {
            const response = await fetch(`/api/users/${user.userId}`, {
                method: 'PATCH',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const json = await response.json();

            if (!response.ok) {
                setError(json.error);
            } else {
                dispatch({ type: 'LOGIN', payload: json });
                setError(null);
                setShowUpdateSuccessModal(true); // Show the update success modal
            }
        } catch (error) {
            setError('Failed to update profile');
        }
    };

    const handleOkClick = () => {
        setShowLogoutSuccessModal(false);
        setShowUpdateSuccessModal(false);
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="profile-photo-container">
                            <div className="profile-photo">
                                <img src={profilePhoto || 'default-photo.jpg'} alt="Profile" />
                                <label htmlFor="upload-photo" className="upload-photo-label">Update Photo</label>
                                <input
                                    type="file"
                                    id="upload-photo"
                                    className="upload-photo-input"
                                    onChange={handlePhotoUpload}
                                />
                            </div>
                        </div>
                        <div className="profile-info">
                            <label>First Name:</label>
                            <input
                                type="text"
                                value={user.firstName || ''}
                                readOnly
                            />
                            <label>Last Name:</label>
                            <input
                                type="text"
                                value={user.lastName || ''}
                                readOnly
                            />
                            <label>About:</label>
                            <textarea
                                value={about || 'Say something about you...'}
                                onChange={(e) => setAbout(e.target.value)}
                            />
                            <button type="submit">Update Profile</button>
                            {error && <div className="error">{error}</div>}
                        </div>
                    </form>
                );
            case 'security':
                return (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="profile-info">
                            <label>Email:</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <label>Password:</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button type="submit">Update Security</button>
                            {error && <div className="error">{error}</div>}
                        </div>
                    </form>
                );
            case 'location':
                return (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="profile-info">
                            <label>Region:</label>
                            <input
                                type="text"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                            />
                            <button type="submit">Update Location</button>
                            {error && <div className="error">{error}</div>}
                        </div>
                    </form>
                );
            case 'notifications':
                return (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="profile-info">
                            <label>Notifications:</label>
                            <input
                                type="text"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                            />
                            <button type="submit">Update Notifications</button>
                            {error && <div className="error">{error}</div>}
                        </div>
                    </form>
                );
            default:
                return null;
        }
    };

    return (
        <div className="profile-container">
            <div className="sidebar">
                <h3>Account Information</h3>
                <ul>
                    <li onClick={() => setActiveSection('profile')}>Profile Settings</li>
                    <li onClick={() => setActiveSection('security')}>Security</li>
                    <li onClick={() => setActiveSection('location')}>Location</li>
                    <li onClick={() => setActiveSection('notifications')}>Notifications</li>
                </ul>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
            <div className="profile-card">
                <h2>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Settings</h2>
                <div className="profile-content">
                    {renderSection()}
                </div>
            </div>

            {showLogoutSuccessModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h4>Logout Successful</h4>
                        <button onClick={handleOkClick}>OK</button>
                    </div>
                </div>
            )}

            {showUpdateSuccessModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h4>Update Successful</h4>
                        <button onClick={handleOkClick}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;