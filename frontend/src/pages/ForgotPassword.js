import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showOtpForm, setShowOtpForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
    
        try {
            const response = await fetch('/api/otp/send-password-reset-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setShowOtpForm(true);
                setSuccessMessage('OTP sent to your email');
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
    
        try {
            const response = await fetch('/api/otp/verify-reset-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    otp,
                    newPassword
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setSuccessMessage('Password reset successful! Redirecting to login...');
                setTimeout(() => {
                    navigate('/auth');
                }, 2000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container" style={{ flex: '1', justifyContent: 'center' }}>
                <form className="auth-form" onSubmit={showOtpForm ? handleResetPassword : handleSendOTP}>
                    <h2>Reset Password</h2>
                    <p>{showOtpForm ? 'Enter the OTP sent to your email and your new password' : 'Enter your email to receive a password reset code'}</p>
                    
                    <label>Email</label>
                    <input 
                        type="email"
                        placeholder="Enter your email"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        required
                        disabled={showOtpForm}
                    />
                    
                    {showOtpForm && (
                        <>
                            <label>OTP</label>
                            <input 
                                type="text"
                                placeholder="Enter OTP from email"
                                onChange={(e) => setOtp(e.target.value)}
                                value={otp}
                                required
                            />
                            
                            <label>New Password</label>
                            <input 
                                type="password"
                                placeholder="Enter new password"
                                onChange={(e) => setNewPassword(e.target.value)}
                                value={newPassword}
                                required
                            />
                        </>
                    )}
                    
                    <button type="submit" className="auth-button" disabled={isLoading}>
                        {isLoading ? 'Please wait...' : (showOtpForm ? 'Reset Password' : 'Send Reset Code')}
                    </button>
                    
                    <p className="toggle-link">
                        <Link to="/auth">Back to Login</Link>
                    </p>
                    
                    {error && <div className="error">{error}</div>}
                    {successMessage && <div className="success-message">{successMessage}</div>}
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;