import React, { useEffect, useState } from 'react';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './Cart.css';

const Cart = () => {
    const { user } = useRecipesContext();
    const [cartItems, setCartItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [newQuantity, setNewQuantity] = useState(1);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const fetchCartItems = async () => {
            if (!user || !user.userId) {
                console.error('User ID is not available');
                return;
            }

            try {
                const response = await fetch(`/api/cart`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                setCartItems(data.items);
            } catch (error) {
                console.error('Error fetching cart items:', error);
            }
        };

        fetchCartItems();
    }, [user]);

    const handleAddItem = async () => {
        if (!newItem || newQuantity < 1) return;

        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ingredient: newItem, quantity: newQuantity })
            });

            if (response.ok) {
                const newCartItem = await response.json();
                setCartItems(prevItems => {
                    const existingItemIndex = prevItems.findIndex(item => item.ingredient.toLowerCase() === newCartItem.ingredient.toLowerCase());
                    if (existingItemIndex !== -1) {
                        const updatedItems = [...prevItems];
                        updatedItems[existingItemIndex] = newCartItem;
                        return updatedItems;
                    } else {
                        return [...prevItems, newCartItem];
                    }
                });
                setNewItem('');
                setNewQuantity(1);
                setShowPopup(false);
            } else {
                console.error('Failed to add item to cart');
            }
        } catch (error) {
            console.error('Error adding item to cart:', error);
        }
    };

    const handleDelete = async (ingredientId) => {
        try {
            const response = await fetch(`/api/cart/delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ingredientId })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            setCartItems(cartItems.filter(item => item._id !== ingredientId));
        } catch (error) {
            console.error('Error deleting cart item:', error);
        }
    };

    const handleQuantityChange = async (ingredientId, newQuantity) => {
        if (newQuantity < 1) return; // Prevent quantity from going below 1

        try {
            const response = await fetch('/api/cart/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ingredientId, quantity: newQuantity })
            });

            if (response.ok) {
                setCartItems(cartItems.map(item =>
                    item._id === ingredientId ? { ...item, quantity: parseInt(newQuantity, 10) } : item
                ));
            } else {
                console.error('Failed to update ingredient quantity');
            }
        } catch (error) {
            console.error('Error updating ingredient quantity:', error);
        }
    };

    return (
        <div className="cart">
            <h1>My Cart</h1>
            <button className="add-ingredient-btn" onClick={() => setShowPopup(true)}>Add Your Own Ingredient</button>
            {showPopup && (
                <div className="popup">
                    <div className="popup-content">
                        <h2>Add Ingredient</h2>
                        <input
                            type="text"
                            placeholder="Item name"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                        />
                        <input
                            type="number"
                            min="1"
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(parseInt(e.target.value, 10))}
                        />
                        <button onClick={handleAddItem}>Add</button>
                        <button onClick={() => setShowPopup(false)}>Cancel</button>
                    </div>
                </div>
            )}
            <table className="cart-table">
                <thead>
                    <tr>
                        <th>Ingredient</th>
                        <th>Quantity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {cartItems.length > 0 ? (
                        cartItems.map((item, index) => (
                            <tr key={index}>
                                <td>{item.ingredient}</td>
                                <td>
                                    <div className="quantity-controls">
                                        <button onClick={() => handleQuantityChange(item._id, item.quantity - 1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => handleQuantityChange(item._id, item.quantity + 1)}>+</button>
                                    </div>
                                </td>
                                <td>
                                    <button className="delete-btn" onClick={() => handleDelete(item._id)}>
                                        <span className="material-icons">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3">No items in the cart.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Cart;