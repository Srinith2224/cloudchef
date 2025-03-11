import React, { createContext, useReducer } from 'react';

const RecipesContext = createContext();

const recipesReducer = (state, action) => {
    switch (action.type) {
        case 'SET_RECIPES':
            return {
                ...state,
                recipes: action.payload
            };
        case 'CREATE_RECIPE':
            return {
                ...state,
                recipes: [action.payload, ...state.recipes]
            };
        case 'DELETE_RECIPE':
            return {
                ...state,
                recipes: state.recipes.filter((w) => w._id !== action.payload._id)
            };
        case 'LOGIN':
            localStorage.setItem('token', action.payload.token);
            return {
                ...state,
                user: {
                    email: action.payload.email,
                    token: action.payload.token,
                    firstName: action.payload.firstName,
                    lastName: action.payload.lastName,
                    userId: action.payload.userId,
                    role: action.payload.role // Make sure to include role
                }
            };
        case 'LOGOUT':
            localStorage.removeItem('token');
            return {
                ...state,
                user: null
            };
        default:
            return state;
    }
};

const RecipesContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(recipesReducer, {
        recipes: [],
        user: null
    });

    return (
        <RecipesContext.Provider value={{ ...state, dispatch }}>
            {children}
        </RecipesContext.Provider>
    );
};

export { RecipesContext, RecipesContextProvider, recipesReducer };
