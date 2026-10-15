import React, { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import { PageLoader } from './components/Spinner';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Explore from './pages/Explore';

// Less-visited pages load on demand to keep the first load fast
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const RecipeDetails = lazy(() => import('./pages/RecipeDetails'));
const CookMode = lazy(() => import('./pages/CookMode'));
const RecipeEditor = lazy(() => import('./pages/RecipeEditor'));
const MyRecipes = lazy(() => import('./pages/MyRecipes'));
const SavedRecipes = lazy(() => import('./pages/SavedRecipes'));
const ShoppingList = lazy(() => import('./pages/ShoppingList'));
const MealPlanner = lazy(() => import('./pages/MealPlanner'));
const AiChef = lazy(() => import('./pages/AiChef'));
const Settings = lazy(() => import('./pages/Settings'));
const CookProfile = lazy(() => import('./pages/CookProfile'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Private = ({ children, admin }) => <RequireAuth admin={admin}>{children}</RequireAuth>;

// Old URLs from the previous version keep working
const Redirect = ({ to }) => {
  const params = useParams();
  const { search } = useLocation();
  return <Navigate replace to={to.replace(/:(\w+)/g, (_, k) => params[k]) + search} />;
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="app">
      <ScrollToTop />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={user ? <Navigate to="/explore" replace /> : <Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/recipe/:id" element={<RecipeDetails />} />
            <Route path="/recipe/:id/cook" element={<CookMode />} />
            <Route path="/cook/:id" element={<CookProfile />} />

            <Route path="/new-recipe" element={<Private><RecipeEditor /></Private>} />
            <Route path="/edit-recipe/:id" element={<Private><RecipeEditor /></Private>} />
            <Route path="/my-recipes" element={<Private><MyRecipes /></Private>} />
            <Route path="/saved" element={<Private><SavedRecipes /></Private>} />
            <Route path="/shopping-list" element={<Private><ShoppingList /></Private>} />
            <Route path="/planner" element={<Private><MealPlanner /></Private>} />
            <Route path="/ai-chef" element={<Private><AiChef /></Private>} />
            <Route path="/settings" element={<Private><Settings /></Private>} />
            <Route path="/admin/*" element={<Private admin><Admin /></Private>} />

            <Route path="/welcome" element={<Redirect to="/explore" />} />
            <Route path="/Auth" element={<Redirect to="/auth" />} />
            <Route path="/add-recipe" element={<Redirect to="/new-recipe" />} />
            <Route path="/update-recipe/:id" element={<Redirect to="/edit-recipe/:id" />} />
            <Route path="/saved-recipes" element={<Redirect to="/saved" />} />
            <Route path="/cart" element={<Redirect to="/shopping-list" />} />
            <Route path="/scheduled-meals" element={<Redirect to="/planner" />} />
            <Route path="/generate-recipe" element={<Redirect to="/ai-chef" />} />
            <Route path="/profile" element={<Redirect to="/settings" />} />
            <Route path="/user/:id" element={<Redirect to="/cook/:id" />} />
            <Route path="/search-results" element={<SearchRedirect />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

function SearchRedirect() {
  const params = new URLSearchParams(useLocation().search);
  const q = params.get('query') || params.get('q') || '';
  return <Navigate replace to={`/explore${q ? `?q=${encodeURIComponent(q)}` : ''}`} />;
}
