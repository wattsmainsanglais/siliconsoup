import { useEffect, useState } from 'react';
import { categories } from '../api/client';
import type { Category, CreateCategoryRequest } from '../api/types';

export default function Categories() {
  const [items, setItems] = useState<Category[]>([]);
  const [treeView, setTreeView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCategoryRequest>({
    name: '',
    slug: '',
    description: '',
    parent_id: null,
    sort_order: 0,
  });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = treeView ? await categories.tree() : await categories.list();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [treeView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await categories.update(editingId, form);
      } else {
        await categories.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', slug: '', description: '', parent_id: null, sort_order: 0 });
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleEdit = (cat: Category) => {
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      parent_id: cat.parent_id,
      sort_order: cat.sort_order,
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await categories.delete(id);
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const renderCategory = (cat: Category, depth = 0) => (
    <tr key={cat.id}>
      <td style={{ paddingLeft: `${depth * 20}px` }}>
        {depth > 0 && '└ '}
        {cat.name}
      </td>
      <td>{cat.slug}</td>
      <td>{cat.sort_order}</td>
      <td>
        <button onClick={() => handleEdit(cat)}>Edit</button>
        <button onClick={() => handleDelete(cat.id)} className="danger">Delete</button>
      </td>
      {cat.children?.map((child) => renderCategory(child, depth + 1))}
    </tr>
  );

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Categories</h2>
        <div>
          <label>
            <input
              type="checkbox"
              checked={treeView}
              onChange={(e) => setTreeView(e.target.checked)}
            />
            Tree view
          </label>
          <button onClick={() => setShowForm(true)}>Add Category</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>{editingId ? 'Edit Category' : 'New Category'}</h3>
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
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            Parent
            <select
              value={form.parent_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, parent_id: e.target.value || null })
              }
            >
              <option value="">None (top level)</option>
              {items
                .filter((c) => c.id !== editingId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Sort Order
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </label>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Sort Order</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((cat) => renderCategory(cat))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4}>No categories yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
