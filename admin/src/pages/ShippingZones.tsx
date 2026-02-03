import { useEffect, useState } from 'react';
import { shippingZones } from '../api/client';
import type { ShippingZone } from '../api/types';

export default function ShippingZones() {
  const [items, setItems] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await shippingZones.list();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Shipping Zones</h2>
      </div>

      <p className="hint">
        Shipping zones are read-only in this view. Edit via database or API.
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Countries</th>
            <th>Base Rate</th>
            <th>Per Item</th>
            <th>Free Threshold</th>
          </tr>
        </thead>
        <tbody>
          {items.map((zone) => (
            <tr key={zone.id}>
              <td>{zone.name}</td>
              <td>{zone.countries?.join(', ') || '-'}</td>
              <td>{formatPrice(zone.base_rate_pence)}</td>
              <td>{formatPrice(zone.per_item_rate_pence)}</td>
              <td>{zone.free_threshold_pence ? formatPrice(zone.free_threshold_pence) : '-'}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5}>No shipping zones configured</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
