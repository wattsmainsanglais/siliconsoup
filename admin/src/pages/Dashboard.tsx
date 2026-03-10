import { useEffect, useState } from 'react';
import { categories, products, shippingZones } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    shippingZones: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [cats, prods, zones] = await Promise.all([
          categories.list(),
          products.list(),
          shippingZones.list(),
        ]);
        setStats({
          categories: cats?.length ?? 0,
          products: prods?.length ?? 0,
          shippingZones: zones?.length ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.categories}</h3>
          <p>Categories</p>
        </div>
        <div className="stat-card">
          <h3>{stats.products}</h3>
          <p>Products</p>
        </div>
        <div className="stat-card">
          <h3>{stats.shippingZones}</h3>
          <p>Shipping Zones</p>
        </div>
      </div>
      <div className="api-status">
        <h3>API Status</h3>
        <p className="success">Connected to backend</p>
      </div>
    </div>
  );
}
