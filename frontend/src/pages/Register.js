import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipesContext } from "../hooks/useRecipesContext";
import './Register.css';

const Register = () => {
    const { dispatch } = useRecipesContext();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const user = { firstName, lastName, email, password };

        const response = await fetch('/api/register', {
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
            setError(null);
            setShowSuccessModal(true);
        }
    };

    const handleOkClick = () => {
        setShowSuccessModal(false);
        navigate('/login');
    };

    return (
        <div className="register-container">
            <form className="register-form" onSubmit={handleSubmit}>
                <h3>Register</h3>
                <label>First Name:</label>
                <input 
                    type="text"
                    onChange={(e) => setFirstName(e.target.value)}
                    value={firstName}
                    required
                />
                <label>Last Name:</label>
                <input 
                    type="text"
                    onChange={(e) => setLastName(e.target.value)}
                    value={lastName}
                    required
                />
                <label>Email:</label>
                <input 
                    type="email"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                />
                <label>Password:</label>
                <input 
                    type="password"
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    required
                />
                <button type="submit">Register</button>
                {error && <div className="error">{error}</div>}
            </form>

            {showSuccessModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h4>Registration Successful</h4>
                        <button onClick={handleOkClick}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Register;