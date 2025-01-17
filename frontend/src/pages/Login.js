import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipesContext } from "../hooks/useRecipesContext";
import './Login.css'; // Import the CSS file for styling

const Login = () => {
    const { dispatch } = useRecipesContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const user = { email, password };

        const response = await fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify(user),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const json = await response.json();

        if (!response.ok) {
            setError(json.error);
        }
        if (response.ok) {
            localStorage.setItem('token', json.token);
            dispatch({ type: 'LOGIN', payload: json });
            setError(null);
            setShowSuccessModal(true);
        }
    };

    const handleOkClick = () => {
        setShowSuccessModal(false);
        navigate('/welcome');
    };

    return (
        <>
            <div className="login-container">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h3>Login</h3>
                    <label>Email:</label>
                    <input 
                        type="email"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                    />
                    <label>Password:</label>
                    <input 
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                    />
                    <button>Login</button>
                    {error && <div className="error">{error}</div>}
                </form>

                {showSuccessModal && (
                    <div className="modal">
                        <div className="modal-content">
                            <h4>Login Successful</h4>
                            <button onClick={handleOkClick}>OK</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="register-prompt">
                <p>New here? <button onClick={() => navigate('/register')} className="register-link">Create an account</button></p>
            </div>
        </>
    );
};

export default Login;