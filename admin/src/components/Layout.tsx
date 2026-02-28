import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="layout">
      <nav className="sidebar">
        <h1>SiliconSoup Admin</h1>
        <ul>
          <li>
            <NavLink to="/">Dashboard</NavLink>
          </li>
          <li>
            <NavLink to="/categories">Categories</NavLink>
          </li>
          <li>
            <NavLink to="/products">Products</NavLink>
          </li>
          <li>
            <NavLink to="/option-groups">Option Groups</NavLink>
          </li>
          <li>
            <NavLink to="/images">Images</NavLink>
          </li>
          <li>
            <NavLink to="/reviews">Reviews</NavLink>
          </li>
          <li>
            <NavLink to="/shipping">Shipping Zones</NavLink>
          </li>
        </ul>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
