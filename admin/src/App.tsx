import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import OptionGroups from './pages/OptionGroups';
import ShippingZones from './pages/ShippingZones';
import Images from './pages/Images';
import Reviews from './pages/Reviews';
import Login from './pages/Login';
import { SiteProvider } from './contexts/SiteContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SiteProvider>
                    <Layout />
                  </SiteProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="categories" element={<Categories />} />
              <Route path="products" element={<Products />} />
              <Route path="option-groups" element={<OptionGroups />} />
              <Route path="images" element={<Images />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="shipping" element={<ShippingZones />} />
            </Route>
          </Routes>
        </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
