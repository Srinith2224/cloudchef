import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './Profile.css';

const Profile = () => {
    const { user, dispatch } = useRecipesContext();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('profile');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profilePhoto, setProfilePhoto] = useState('');
    const [profilePhotoFile, setProfilePhotoFile] = useState(null);
    const [about, setAbout] = useState('');
    const [region, setRegion] = useState('');
    const [error, setError] = useState(null);
    const [showLogoutSuccessModal, setShowLogoutSuccessModal] = useState(false);
    const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: false,
        mealPlanReminders: false,
        newRecipeAlerts: false
    });
    const [showPasswordUpdateOtpForm, setShowPasswordUpdateOtpForm] = useState(false);
    const [passwordUpdateOtp, setPasswordUpdateOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
                    
                    // Fix the profile photo URL handling
                    if (data.profilePhoto) {
                        // Check if profilePhoto is a full URL or just a path
                        if (data.profilePhoto.startsWith('http')) {
                            setProfilePhoto(data.profilePhoto);
                        } else {
                            setProfilePhoto(`http://localhost:4000${data.profilePhoto}`);
                        }
                    } else {
                        setProfilePhoto(''); // Don't set a default avatar
                    }
                    
                    setAbout(data.about || '');
                    setRegion(data.region || '');
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

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create a temporary URL for the file to display the preview
            const imageUrl = URL.createObjectURL(file);
            setProfilePhoto(imageUrl); // Set the preview image
            setProfilePhotoFile(file); // Store the file for upload
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('email', email);
        if (password) formData.append('password', password);
        if (profilePhotoFile) formData.append('profilePhoto', profilePhotoFile);
        formData.append('about', about || '');
        formData.append('region', region || '');

        try {
            // Get the token correctly from localStorage
            const token = localStorage.getItem('token');
            
            if (!token) {
                setError('Authentication token missing. Please log in again.');
                return;
            }
            
            const response = await fetch(`/api/users/${user.userId}`, {
                method: 'PATCH',
                body: formData,
                headers: {
                    // Make sure Authorization header is properly formatted
                    'Authorization': `Bearer ${token}`
                }
            });

            const json = await response.json();

            if (!response.ok) {
                setError(json.error);
            } else {
                // Store the EXACT same token that was used for the request
                const currentUser = JSON.parse(localStorage.getItem('user'));
                const updatedUser = {
                    ...currentUser,
                    email: json.email || currentUser.email,
                    profilePhoto: json.profilePhoto || currentUser.profilePhoto,
                    about: json.about || about,
                    region: json.region || region
                };
                
                // Update user in localStorage without touching the token
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                // Update context with same approach
                dispatch({
                    type: 'LOGIN',
                    payload: updatedUser
                });
                
                // Update UI directly
                setProfilePhoto(json.profilePhoto ? 
                    (json.profilePhoto.startsWith('http') ? json.profilePhoto : `http://localhost:4000${json.profilePhoto}`)
                    : profilePhoto);
                
                setError(null);
                setShowUpdateSuccessModal(true);
            }
        } catch (error) {
            setError('Failed to update profile');
            console.error('Profile update error:', error);
        }
    };

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
                localStorage.removeItem('user');
                navigate('/auth');
                setShowLogoutSuccessModal(true);
            } else {
                console.error('Failed to log out');
            }
        }).catch(error => {
            console.error('Error logging out:', error);
        });
    };

    const handleOkClick = () => {
        setShowLogoutSuccessModal(false);
        setShowUpdateSuccessModal(false);
        
        // Add debugging log to check token after update
        if (showUpdateSuccessModal) {
            const token = localStorage.getItem('token');
            console.log('Token after profile update:', token ? 'Valid token exists' : 'No token found');
        }
    };

    const handleToggleNotification = (setting) => {
        setNotificationSettings(prev => ({
            ...prev,
            [setting]: !prev[setting]
        }));
    };

    const handleSendPasswordUpdateOTP = async () => {
        setError(null);
        setSuccessMessage('');
        setIsLoading(true);
        
        if (!password) {
            setError('Please enter a new password');
            setIsLoading(false);
            return;
        }
    
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token missing. Please log in again.');
                setIsLoading(false);
                return;
            }
            
            const response = await fetch('/api/otp/send-password-update-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setShowPasswordUpdateOtpForm(true);
                setSuccessMessage('Verification code sent to your email');
                setNewPassword(password); // Pre-fill the confirmation field
            } else {
                setError(data.error || 'Failed to send verification code');
            }
        } catch (error) {
            setError('Failed to send verification code');
            console.error('Error sending OTP:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSecuritySubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        setIsLoading(true);
        
        // If we're showing the OTP form, handle OTP verification
        if (showPasswordUpdateOtpForm) {
            if (password !== newPassword) {
                setError('Passwords do not match');
                setIsLoading(false);
                return;
            }
            
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Authentication token missing. Please log in again.');
                    setIsLoading(false);
                    return;
                }
                
                const response = await fetch('/api/otp/verify-password-update-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        email,
                        otp: passwordUpdateOtp,
                        newPassword
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    setSuccessMessage('Password updated successfully');
                    setShowPasswordUpdateOtpForm(false);
                    setPassword('');
                    setNewPassword('');
                    setPasswordUpdateOtp('');
                    
                    // Update user in localStorage if needed
                    const currentUser = JSON.parse(localStorage.getItem('user'));
                    if (currentUser && data.email) {
                        const updatedUser = {
                            ...currentUser,
                            email: data.email,
                            profilePhoto: data.profilePhoto || currentUser.profilePhoto
                        };
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                        
                        // Update context
                        dispatch({
                            type: 'LOGIN',
                            payload: updatedUser
                        });
                    }
                    
                    setShowUpdateSuccessModal(true);
                } else {
                    setError(data.error || 'Failed to verify code');
                }
            } catch (error) {
                setError('Failed to update password');
                console.error('Error verifying OTP:', error);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Just handle email update if no password change
            handleUpdateProfile(e);
        }
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="profile-photo-container">
                            <div className="profile-photo">
                                <img 
                                    src={profilePhoto} 
                                    alt="Profile" 
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        // Don't set a fallback image
                                    }} 
                                    style={{ display: profilePhoto ? 'block' : 'none' }}
                                />
                                {!profilePhoto && (
                                    <span className="material-icons profile-icon" style={{ fontSize: '180px', opacity: '0.5' }}>
                                        account_circle
                                    </span>
                                )}
                                <label htmlFor="upload-photo" className="upload-photo-label">
                                    Update Photo
                                </label>
                                <input
                                    type="file"
                                    id="upload-photo"
                                    className="upload-photo-input"
                                    onChange={handlePhotoUpload}
                                    accept="image/*"
                                />
                            </div>
                        </div>
                        <div className="profile-info">
                            <div className="input-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={user?.firstName || ''}
                                    readOnly
                                />
                            </div>
                            <div className="input-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={user?.lastName || ''}
                                    readOnly
                                />
                            </div>
                            <div className="input-group full-width">
                                <label>About Me</label>
                                <textarea
                                    value={about}
                                    onChange={(e) => setAbout(e.target.value)}
                                    placeholder="Tell us a bit about yourself and your cooking interests..."
                                />
                            </div>
                            <div className="button-group">
                                <button type="submit" className="update-button">Update Profile</button>
                            </div>
                            {error && <div className="error">{error}</div>}
                        </div>
                    </form>
                );
            case 'security':
                return (
                    <form onSubmit={handleSecuritySubmit} className="profile-form">
                        <div className="profile-info">
                            <div className="input-group full-width">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    readOnly
                                    className="readonly-input"
                                />
                            </div>
                            
                            {!showPasswordUpdateOtpForm ? (
                                <>
                                    <div className="input-group full-width">
                                        <label>Update Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter new password"
                                        />
                                    </div>
                                    <div className="button-group">
                                        <button 
                                            type="button" 
                                            className="update-button"
                                            onClick={handleSendPasswordUpdateOTP}
                                            disabled={!password || isLoading}
                                        >
                                            {isLoading ? 'Sending...' : 'Update Password'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // OTP verification form remains unchanged
                                <>
                                    <div className="input-group full-width">
                                        <label>Enter OTP sent to your email:</label>
                                        <input 
                                            type="text"
                                            placeholder="Enter verification code"
                                            value={passwordUpdateOtp}
                                            onChange={(e) => setPasswordUpdateOtp(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="input-group full-width">
                                        <label>Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Re-enter your new password"
                                            required
                                        />
                                    </div>
                                    <div className="button-group">
                                        <button 
                                            type="submit" 
                                            className="update-button"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Verifying...' : 'Verify & Update'}
                                        </button>
                                        <button 
                                            type="button" 
                                            className="cancel-button"
                                            onClick={() => {
                                                setShowPasswordUpdateOtpForm(false);
                                                setPasswordUpdateOtp('');
                                                setNewPassword('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {successMessage && <div className="success-message">{successMessage}</div>}
                            {error && <div className="error">{error}</div>}
                        </div>
                    </form>
                );
            case 'location':
                return (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="profile-info">
                            <div className="input-group full-width">
                                <label>Your Region</label>
                                <input
                                    type="text"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                    placeholder="e.g., North America, Europe, Asia..."
                                />
                            </div>
                            <div className="button-group">
                                <button type="submit" className="update-button">Update Location</button>
                            </div>
                            {error && <div className="error">{error}</div>}
                        </div>
                    </form>
                );
            case 'notifications':
                return (
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="profile-info">
                            <div className="input-group full-width">
                                <div className="toggle-container">
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox"
                                            checked={notificationSettings.emailNotifications}
                                            onChange={() => handleToggleNotification('emailNotifications')}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">Email Notifications</span>
                                    </label>
                                </div>
                            </div>
                            <div className="input-group full-width">
                                <div className="toggle-container">
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox"
                                            checked={notificationSettings.mealPlanReminders}
                                            onChange={() => handleToggleNotification('mealPlanReminders')}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">Meal Plan Reminders</span>
                                    </label>
                                </div>
                            </div>
                            <div className="input-group full-width">
                                <div className="toggle-container">
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox"
                                            checked={notificationSettings.newRecipeAlerts}
                                            onChange={() => handleToggleNotification('newRecipeAlerts')}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">New Recipe Alerts</span>
                                    </label>
                                </div>
                            </div>
                            <div className="button-group">
                                <button type="submit" className="update-button">Save Preferences</button>
                            </div>
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
                <h3>Account Settings</h3>
                <ul>
                    <li 
                        className={activeSection === 'profile' ? 'active' : ''} 
                        onClick={() => setActiveSection('profile')}
                    >
                        <span className="material-icons">person</span>Profile
                    </li>
                    <li 
                        className={activeSection === 'security' ? 'active' : ''} 
                        onClick={() => setActiveSection('security')}
                    >
                        <span className="material-icons">security</span>Security
                    </li>
                    <li 
                        className={activeSection === 'location' ? 'active' : ''} 
                        onClick={() => setActiveSection('location')}
                    >
                        <span className="material-icons">location_on</span>Location
                    </li>
                    <li 
                        className={activeSection === 'notifications' ? 'active' : ''} 
                        onClick={() => setActiveSection('notifications')}
                    >
                        <span className="material-icons">notifications</span>Notifications
                    </li>
                </ul>
                <button className="logout-button" onClick={handleLogout}>
                    <span className="material-icons">logout</span>
                    Sign Out
                </button>
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