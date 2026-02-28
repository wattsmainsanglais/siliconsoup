import { useEffect, useState } from 'react';
import { reviews } from '../api/client';
import type { Review } from '../api/types';

const STATUS_FILTERS = ['all', 'published', 'removed'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', letterSpacing: '1px' }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function Reviews() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadReviews = async (filter: StatusFilter) => {
    try {
      setLoading(true);
      const data = await reviews.list(filter === 'all' ? undefined : filter);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(statusFilter);
  }, [statusFilter]);

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this review? It will no longer be shown publicly.')) return;
    try {
      await reviews.remove(id);
      setItems(items.map(r => r.id === id ? { ...r, status: 'removed' } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove review');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h2>Reviews</h2>
      </div>

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.85rem',
              background: statusFilter === f ? '#1a1a2e' : '#f3f4f6',
              color: statusFilter === f ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Name</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{r.product_name || r.product_id}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.display_name}</td>
                <td><StarRating rating={r.rating} /></td>
                <td style={{ maxWidth: '280px' }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.comment}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${r.status}`}>{r.status}</span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                <td>
                  {r.status === 'published' && (
                    <button onClick={() => handleRemove(r.id)} className="danger">Remove</button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7}>No reviews yet</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
