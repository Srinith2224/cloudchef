import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRecipesContext } from "../hooks/useRecipesContext";
import Lottie from 'react-lottie';
import animationData from '../assets/cooking-background.json';
import './Auth.css'; 
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const Auth = () => {
    const { dispatch } = useRecipesContext();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [googleClientId, setGoogleClientId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showOtpForm, setShowOtpForm] = useState(false);
    const [otp, setOtp] = useState('');

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const user = isLogin ? { email, password } : { firstName, lastName, email, password };
        const endpoint = isLogin ? '/api/login' : '/api/register';

        const response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(user),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const json = await response.json();

        if (!response.ok) {
            setError(json.error);
        } else {
            // Save user to local storage
            localStorage.setItem('user', JSON.stringify(json));
            localStorage.setItem('token', json.token);
            
            // Update auth context
            dispatch({ type: 'LOGIN', payload: json });
            
            // Show success modal
            setShowSuccessModal(true);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const response = await fetch('/api/google-signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: credentialResponse.credential 
                })
            });

            const json = await response.json();

            if (!response.ok) {
                setError(json.error);
            } else {
                // Save user to local storage
                localStorage.setItem('user', JSON.stringify(json));
                localStorage.setItem('token', json.token);
                
                // Update auth context
                dispatch({ type: 'LOGIN', payload: json });
                
                // Show success modal
                setShowSuccessModal(true);
            }
        } catch (error) {
            setError('Failed to authenticate with Google');
            console.error(error);
        }
    };

    const handleGoogleFailure = () => {
        setError('Google sign-in was unsuccessful');
    };

    const handleOkClick = () => {
        setShowSuccessModal(false);
        if (isLogin) {
            navigate('/welcome');
        } else {
            setIsLogin(true);
        }
    };

    useEffect(() => {
        const fetchGoogleClientId = async () => {
            try {
                const response = await fetch('/api/google-client-id');
                const data = await response.json();
                if (data.clientId) {
                    setGoogleClientId(data.clientId);
                }
            } catch (error) {
                console.error('Error fetching Google Client ID:', error);
            }
        };
        
        fetchGoogleClientId();
    }, []);

    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
    
        try {
            const response = await fetch('/api/otp/send-registration-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setShowOtpForm(true);
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
    
        try {
            const response = await fetch('/api/otp/verify-registration-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    otp
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save user to local storage
                localStorage.setItem('user', JSON.stringify(data));
                localStorage.setItem('token', data.token);
                
                // Update auth context
                dispatch({ type: 'LOGIN', payload: data });
                
                // Show success modal
                setShowSuccessModal(true);
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-animation">
                <div className="lottie-container">
                    <Lottie options={defaultOptions} height={600} width={700} />
                </div>
            </div>
            <div className="auth-container">
                <form 
                    className="auth-form" 
                    onSubmit={isLogin ? handleSubmit : (showOtpForm ? handleVerifyOTP : handleSendOTP)}
                >
                    <h2>{isLogin ? 'Welcome back' : 'Get Started'}</h2>
                    <p>{isLogin ? 'Welcome back! Please enter your details' : 'Please fill in the details to create an account'}</p>
                    
                    {!isLogin && !showOtpForm && (
                        <>
                            <label>First Name</label>
                            <input 
                                type="text"
                                placeholder="Enter your first name"
                                onChange={(e) => setFirstName(e.target.value)}
                                value={firstName}
                                required
                            />
                            <label>Last Name</label>
                            <input 
                                type="text"
                                placeholder="Enter your last name"
                                onChange={(e) => setLastName(e.target.value)}
                                value={lastName}
                                required
                            />
                        </>
                    )}
                    {!showOtpForm && (
                        <>
                            <label>Email</label>
                            <input 
                                type="email"
                                placeholder="Enter your email"
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                required
                            />
                            <label>Password</label>
                            <input 
                                type="password"
                                placeholder="**********"
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                                required
                            />
                        </>
                    )}
                    {isLogin && (
                        <div className="auth-options">
                            <label>
                                <input type="checkbox" />
                                Remember&nbsp;me
                            </label>
                            <Link to="/forgot-password">Forgot password?</Link>
                        </div>
                    )}
                    {!isLogin && showOtpForm && (
                        <>
                            <label>Enter OTP sent to your email:</label>
                            <input 
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </>
                    )}
                    
                    <button type="submit" className="auth-button" disabled={isLoading}>
                        {isLoading ? (showOtpForm ? 'Verifying...' : 'Sending...') : (isLogin ? 'Sign in' : (showOtpForm ? 'Verify OTP' : 'Send OTP'))}
                    </button>
                    
                    {isLogin && googleClientId && (
                        <>
                            <div className="auth-separator">
                                <span>OR</span>
                            </div>
                            <div className="google-login-container">
                                <GoogleOAuthProvider clientId={googleClientId}>
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleFailure}
                                        useOneTap={false}
                                        theme="filled_black"
                                        size="large"
                                        text="signin_with"
                                        width="100%"
                                        logo_alignment="left"
                                        shape="rectangular"
                                    />
                                </GoogleOAuthProvider>
                            </div>
                        </>
                    )}
                    <p className="toggle-link">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        <a 
                            href="#" 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                setIsLogin(!isLogin); 
                                setShowOtpForm(false);
                                setError(null);
                            }}
                        >
                            {isLogin ? 'Sign up for free!' : 'Sign in'}
                        </a>
                    </p>
                    {error && <div className="error">{error}</div>}
                </form>

                {showSuccessModal && (
                    <div className="modal">
                        <div className="modal-content">
                            <h4>{isLogin ? 'Login Successful' : 'Registration Successful'}</h4>
                            <button onClick={handleOkClick}>OK</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auth;