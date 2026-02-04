import { useEffect, useState } from 'react';
import { products, categories, images } from '../api/client';
import type { Product, Category, CreateProductRequest, ProductImage } from '../api/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateProductRequest>({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    category_id: null,
    base_price_pence: 0,
    status: 'draft',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentImages, setCurrentImages] = useState<ProductImage[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsData, catsData] = await Promise.all([
        products.list(),
        categories.list(),
      ]);
      setItems(prodsData);
      setCats(catsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let product: Product;
      if (editingId) {
        product = await products.update(editingId, form);
      } else {
        product = await products.create(form);
      }

      // Upload image if selected
      if (selectedFile) {
        await images.upload(product.id, selectedFile);
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', slug: '', short_description: '', description: '', category_id: null, base_price_pence: 0, status: 'draft' });
      setSelectedFile(null);
      setCurrentImages([]);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleEdit = (prod: Product) => {
    setForm({
      name: prod.name,
      slug: prod.slug,
      short_description: prod.short_description || '',
      description: prod.description || '',
      category_id: prod.category_id || null,
      base_price_pence: prod.base_price_pence,
      status: prod.status,
    });
    setEditingId(prod.id);
    setCurrentImages(prod.images || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await products.delete(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Products</h2>
        <button onClick={() => setShowForm(true)}>Add Product</button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <form onSubmit={handleSubmit} className="form-card" style={{ flex: 1 }}>
            <h3>{editingId ? 'Edit Product' : 'New Product'}</h3>
            <label>
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Slug
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
              />
            </label>
            <label>
              Short Description
              <textarea
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                rows={2}
              />
              <small>Brief summary for product cards and listings</small>
            </label>
            <label>
              Full Description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={5}
              />
              <small>Detailed description for product page</small>
            </label>
            <label>
              Category
              <select
                value={form.category_id ?? ''}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value || null })
                }
              >
                <option value="">None</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price (pence)
              <input
                type="number"
                value={form.base_price_pence}
                onChange={(e) => setForm({ ...form, base_price_pence: Number(e.target.value) })}
                required
              />
              <small>e.g., 3350 = £33.50</small>
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              Add Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>
            {selectedFile && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain' }}
                />
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1',
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )}
            <div className="form-actions">
              <button type="submit">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setCurrentImages([]); }}>
                Cancel
              </button>
            </div>
          </form>

          {editingId && (
            <div className="form-card" style={{ width: '300px' }}>
              <h3>Current Images</h3>
              {currentImages.length === 0 ? (
                <p style={{ color: '#666' }}>No images yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {currentImages.map((img, idx) => (
                    <div key={idx} style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px' }}>
                      <img
                        src={`${API_BASE}${img.url}`}
                        alt={img.alt || `Product image ${idx + 1}`}
                        style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }}
                      />
                      {img.alt && <small style={{ display: 'block', marginTop: '0.25rem' }}>{img.alt}</small>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Category</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((prod) => (
            <tr key={prod.id}>
              <td>{prod.name}</td>
              <td>{prod.slug}</td>
              <td>{prod.category_name || '-'}</td>
              <td>{formatPrice(prod.base_price_pence)}</td>
              <td><span className={`status-badge status-${prod.status}`}>{prod.status}</span></td>
              <td>
                <button onClick={() => handleEdit(prod)}>Edit</button>
                <button onClick={() => handleDelete(prod.id)} className="danger">Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6}>No products yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
