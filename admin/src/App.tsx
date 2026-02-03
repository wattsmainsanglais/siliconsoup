import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import OptionGroups from './pages/OptionGroups';
import ShippingZones from './pages/ShippingZones';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="categories" element={<Categories />} />
          <Route path="products" element={<Products />} />
          <Route path="option-groups" element={<OptionGroups />} />
          <Route path="shipping" element={<ShippingZones />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
