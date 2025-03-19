import React, { createContext, useReducer, useEffect } from 'react';
import { recipesReducer, initialState } from './RecipeContext';

export const RecipesContext = createContext();

export const RecipesContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(recipesReducer, initialState);

    useEffect(() => {
        const checkToken = () => {
            try {
                const token = localStorage.getItem('token');
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                
                // Check if token is valid
                if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string') {
                    console.log('Invalid token found during startup, clearing auth data');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    dispatch({ type: 'LOGOUT' });
                    return;
                }
                
                // Check if user data is valid
                if (!userData.userId) {
                    console.log('Invalid user data found during startup, clearing auth data');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    dispatch({ type: 'LOGOUT' });
                    return;
                }
                
                // If both are valid, restore auth state
                dispatch({ 
                    type: 'LOGIN', 
                    payload: { ...userData, token } 
                });
            } catch (error) {
                console.error('Error checking authentication on startup:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                dispatch({ type: 'LOGOUT' });
            }
        };
        
        checkToken();
    }, [dispatch]);

    return (
        <RecipesContext.Provider value={{ ...state, dispatch }}>
            {children}
        </RecipesContext.Provider>
    );
};
