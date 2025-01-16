import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';

// pages and components 

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Welcome from './pages/Welcome';
import LandingPage from './pages/LandingPage';
import Profile from './pages/Profile';
import RecipeDetails from './pages/RecipeDetails';
import RecipeForm from './components/RecipeForm';
import MyRecipes from './pages/MyRecipes';
import UpdateRecipe from './pages/UpdateRecipe';
import SavedRecipes from './pages/SavedRecipes';
import SearchResults from './pages/SearchResults';
import Cart from './pages/Cart';
import GenerateRecipe from './pages/GenerateRecipe';

function App() {
  return (
    <div className="App">
      <Router>
        <Navbar />
        <div className='pages'>
          <Routes>
            <Route path="/" element={<Layout><LandingPage /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/register" element={<Layout><Register /></Layout>} />
            <Route path="/welcome" element={<RequireAuth><Layout><Welcome /></Layout></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Layout><Profile /></Layout></RequireAuth>} />
            <Route path="/recipe/:id" element={<RequireAuth><Layout><RecipeDetails /></Layout></RequireAuth>} />
            <Route path="/search-results" element={<RequireAuth><SearchResults /></RequireAuth>} />
            <Route path="/add-recipe" element={<RequireAuth><Layout><RecipeForm /></Layout></RequireAuth>} />
            <Route path="/my-recipes" element={<RequireAuth><Layout><MyRecipes /></Layout></RequireAuth>} />
            <Route path="/update-recipe/:id" element={<RequireAuth><Layout><UpdateRecipe /></Layout></RequireAuth>} />
            <Route path="/saved-recipes" element={<RequireAuth><Layout><SavedRecipes /></Layout></RequireAuth>} />
            <Route path="/cart" element={<RequireAuth><Layout><Cart /></Layout></RequireAuth>} />
            <Route path="/generate-recipe" element={<RequireAuth><Layout><GenerateRecipe /></Layout></RequireAuth>} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
