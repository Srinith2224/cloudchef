import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import Welcome from './pages/Welcome';
import Profile from './pages/Profile';
import RecipeDetails from './pages/RecipeDetails';
import SearchResults from './pages/SearchResults';
import RecipeForm from './components/RecipeForm';
import MyRecipes from './pages/MyRecipes';
import UpdateRecipe from './pages/UpdateRecipe';
import SavedRecipes from './pages/SavedRecipes';
import Cart from './pages/Cart';
import GenerateRecipe from './pages/GenerateRecipe';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <div className="App">
      <Router>
        <Navbar />
        <div className='pages'>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/Auth" element={<Auth />} />
            <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/recipe/:id" element={<RequireAuth><RecipeDetails /></RequireAuth>} />
            <Route path="/search-results" element={<RequireAuth><SearchResults /></RequireAuth>} />
            <Route path="/add-recipe" element={<RequireAuth><RecipeForm /></RequireAuth>} />
            <Route path="/my-recipes" element={<RequireAuth><MyRecipes /></RequireAuth>} />
            <Route path="/update-recipe/:id" element={<RequireAuth><UpdateRecipe /></RequireAuth>} />
            <Route path="/saved-recipes" element={<RequireAuth><SavedRecipes /></RequireAuth>} />
            <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
            <Route path="/generate-recipe" element={<RequireAuth><GenerateRecipe /></RequireAuth>} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;