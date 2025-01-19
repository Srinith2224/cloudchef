import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipesContext } from "../hooks/useRecipesContext";
import Lottie from 'react-lottie';
import animationData from '../assets/cooking-background.json';
import './Auth.css'; 
import googleIcon from '../assets/google.png';

const Auth = () => {
    
    const { dispatch } = useRecipesContext();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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
            if (isLogin) {
                localStorage.setItem('token', json.token);
                dispatch({ type: 'LOGIN', payload: json });
                setShowSuccessModal(true);
            } else {
                setShowSuccessModal(true);
            }
            setError(null);
        }
    };

    const handleOkClick = () => {
        setShowSuccessModal(false);
        if (isLogin) {
            navigate('/welcome');
        } else {
            setIsLogin(true);
        }
    };

    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
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
                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>{isLogin ? 'Welcome back' : 'Get Started'}</h2>
                    <p>{isLogin ? 'Welcome back! Please enter your details' : 'Please fill in the details to create an account'}</p>
                    {!isLogin && (
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
                    {isLogin && (
                        <div className="auth-options">
                            <label>
                                <input type="checkbox" />
                                Remember&nbsp;me
                            </label>
                            <a href="/forgot-password">Forgot password?</a>
                        </div>
                    )}
                    <button type="submit">{isLogin ? 'Sign in' : 'Register'}</button>
                    {isLogin && (
    <button type="button" className="google-signin">
        <img src={googleIcon} alt="Google Icon" className="google-icon" />
        Sign in with Google
    </button>
)}
                    <p className="toggle-link">
                        {isLogin ? "Don’t have an account? " : "Already have an account? "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
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