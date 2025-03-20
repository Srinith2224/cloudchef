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

    const handleLogin = async (userData) => {
        try {
            // Make sure the token is a string before storing
            if (typeof userData.token !== 'string') {
                console.error('Invalid token format:', userData.token);
                throw new Error('Invalid token format');
            }
            
            // Store token correctly
            localStorage.setItem('token', userData.token);
            
            // Store user info separately
            localStorage.setItem('user', JSON.stringify({
                userId: userData.userId,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role
            }));
            
            // Update context
            dispatch({ type: 'LOGIN', payload: userData });
        } catch (error) {
            console.error('Error storing authentication data:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
      
        try {
          // Normalize email to lowercase
          const normalizedEmail = email.toLowerCase();
          
          const user = isLogin ? 
            { email: normalizedEmail, password } : 
            { firstName, lastName, email: normalizedEmail, password };
          
          const endpoint = isLogin ? '/api/login' : '/api/register';
      
          const response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(user),
            headers: {
              'Content-Type': 'application/json'
            }
          });
      
          const data = await response.json();
      
          if (response.ok) {
            // Validate the token before storing
            if (!data.token || typeof data.token !== 'string') {
              setError('Invalid authentication token received');
              setIsLoading(false);
              return;
            }
      
            // Store token
            localStorage.setItem('token', data.token);
            
            // Store user data 
            const userData = {
              userId: data.userId,
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              role: data.role || 'user'
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Update auth context
            dispatch({ 
              type: 'LOGIN', 
              payload: { ...userData, token: data.token }
            });
            
            // Show success modal
            setShowSuccessModal(true);
          } else {
            setError(data.error || 'Authentication failed');
          }
        } catch (error) {
          setError('An unexpected error occurred. Please try again.');
          console.error('Login error:', error);
        } finally {
          setIsLoading(false);
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

            if (response.ok) {
                // Make sure token is correctly extracted and stored
                const userData = await response.json();
                
                if (!userData.token) {
                    setError('Server response missing authentication token');
                    return;
                }
                
                // Store token properly (make sure it's a string)
                await handleLogin(userData);
                
                // Show success modal
                setShowSuccessModal(true);
            } else {
                const json = await response.json();
                setError(json.error);
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
        // Always navigate to welcome page after successful authentication
        navigate('/welcome');
    };

    useEffect(() => {
        const fetchGoogleClientId = async () => {
            try {
                const response = await fetch('/api/google-client-id');
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                const data = await response.json();
                if (data.clientId) {
                    setGoogleClientId(data.clientId);
                    console.log('Successfully loaded Google Client ID');
                } else {
                    console.error('Google Client ID not returned from server');
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
                // Make sure data.token exists and is a valid string
                if (!data.token) {
                    setError('Server response missing authentication token');
                    return;
                }
                
                // Store the token
                await handleLogin(data);
                
                setShowSuccessModal(true);
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (error) {
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