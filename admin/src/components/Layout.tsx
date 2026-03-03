import { NavLink, Outlet } from 'react-router-dom';
import { useSite } from '../contexts/SiteContext';

export default function Layout() {
  const { sites, activeSite, setActiveSite } = useSite();

  return (
    <div className="layout">
      <nav className="sidebar">
        <h1>SiliconSoup Admin</h1>

        {sites.length > 0 && (
          <div className="site-switcher">
            <label htmlFor="site-select">Site</label>
            <select
              id="site-select"
              value={activeSite?.id ?? ''}
              onChange={(e) => {
                const site = sites.find((s) => s.id === e.target.value);
                if (site) setActiveSite(site);
              }}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
        {/* key forces page components to unmount/remount on site switch, triggering fresh fetches */}
        <Outlet key={activeSite?.id} />
      </main>
    </div>
  );
}
