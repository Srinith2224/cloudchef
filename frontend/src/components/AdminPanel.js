import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import './AdminPanel.css';

// User Management Component
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      // Update the user in the list
      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      setError(error.message);
    }
  };
  
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? All their recipes will also be deleted.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      // Remove the user from the list
      setUsers(users.filter(user => user._id !== userId));
    } catch (error) {
      setError(error.message);
    }
  };
  
  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="error">{error}</div>;
  
  return (
    <div className="admin-user-management">
      <h2>User Management</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>
              <td>
                <select 
                  value={user.role} 
                  onChange={(e) => updateUserRole(user._id, e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Guest</option>
                </select>
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>
                <button 
                  className="admin-delete-button" 
                  onClick={() => deleteUser(user._id)}
                  title="Delete user"
                >
                  <span className="material-icons">delete_outline</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Enhance RecipeManagement component with view/edit functionality

const RecipeManagement = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }
        
        const data = await response.json();
        setRecipes(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecipes();
  }, []);
  
  const deleteRecipe = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }
      
      // Remove the recipe from the list
      setRecipes(recipes.filter(recipe => recipe._id !== recipeId));
    } catch (error) {
      setError(error.message);
    }
  };
  
  const viewRecipe = (recipeId) => {
    navigate(`/recipe/${recipeId}`);
  };
  
  const editRecipe = (recipeId) => {
    navigate(`/update-recipe/${recipeId}`);
  };
  
  if (loading) return <div>Loading recipes...</div>;
  if (error) return <div className="error">{error}</div>;
  
  return (
    <div className="admin-recipe-management">
      <h2>Recipe Management</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Recipe</th>
            <th>Created By</th>
            <th>Created On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map(recipe => (
            <tr key={recipe._id}>
              <td>
                {recipe.mainImage ? (
                  <img 
                    src={recipe.mainImage.startsWith('http') ? recipe.mainImage : `http://localhost:4000${recipe.mainImage}`} 
                    alt={recipe.title}
                    className="admin-recipe-thumbnail"
                  />
                ) : (
                  <div className="admin-recipe-no-image">
                    <span className="material-icons">restaurant_menu</span>
                  </div>
                )}
              </td>
              <td>{recipe.title}</td>
              <td>{recipe.createdBy.firstName} {recipe.createdBy.lastName}</td>
              <td>{new Date(recipe.createdAt).toLocaleDateString()}</td>
              <td className="admin-actions-cell">
                <button 
                  className="admin-view-button" 
                  onClick={() => viewRecipe(recipe._id)}
                  title="View recipe"
                >
                  <span className="material-icons">visibility</span>
                </button>
                <button 
                  className="admin-edit-button" 
                  onClick={() => editRecipe(recipe._id)}
                  title="Edit recipe"
                >
                  <span className="material-icons">edit</span>
                </button>
                <button 
                  className="admin-delete-button" 
                  onClick={() => deleteRecipe(recipe._id)}
                  title="Delete recipe"
                >
                  <span className="material-icons">delete_outline</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main Admin Panel Component
const AdminPanel = () => {
  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      
      <div className="admin-nav">
        <Link to="/admin/users">User Management</Link>
        <Link to="/admin/recipes">Recipe Management</Link>
      </div>
      
      <div className="admin-content">
        <Routes>
          <Route path="users" element={<UserManagement />} />
          <Route path="recipes" element={<RecipeManagement />} />
          <Route path="/" element={<div className="admin-welcome">Welcome to the Admin Panel</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminPanel;