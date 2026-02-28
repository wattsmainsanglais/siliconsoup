import { useEffect, useRef, useState } from 'react';
import { products, categories, optionGroups, productFiles } from '../api/client';
import type { Product, Category, CreateProductRequest, ProductImage, OptionGroup, StoreImage, ProductFile } from '../api/types';
import ImagePickerModal from '../components/ImagePickerModal';

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
  const [currentImages, setCurrentImages] = useState<ProductImage[]>([]);
  const [allOptionGroups, setAllOptionGroups] = useState<OptionGroup[]>([]);
  const [linkedOptionGroups, setLinkedOptionGroups] = useState<OptionGroup[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  // Physical details
  const [weightGrams, setWeightGrams] = useState('');
  const [dimLength, setDimLength] = useState('');
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  // Files panel
  const [linkedFiles, setLinkedFiles] = useState<ProductFile[]>([]);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileType, setNewFileType] = useState<'pdf' | 'url'>('url');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsData, catsData, optGroupsData] = await Promise.all([
        products.list(),
        categories.list(),
        optionGroups.list(),
      ]);
      setItems(prodsData);
      setCats(catsData);
      setAllOptionGroups(optGroupsData || []);
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
      // Build images array from currentImages
      const imagesPayload = currentImages.map((img, idx) => ({
        url: img.url,
        alt: img.alt || '',
        sort_order: idx + 1,
      }));

      const hasDimensions = dimLength || dimWidth || dimHeight;
      const payload: CreateProductRequest = {
        ...form,
        images: imagesPayload,
        weight_grams: weightGrams ? parseInt(weightGrams) : null,
        dimensions: hasDimensions ? {
          length_mm: parseInt(dimLength) || 0,
          width_mm: parseInt(dimWidth) || 0,
          height_mm: parseInt(dimHeight) || 0,
        } : null,
      };

      if (editingId) {
        await products.update(editingId, payload);
      } else {
        await products.create(payload);
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', slug: '', short_description: '', description: '', category_id: null, base_price_pence: 0, status: 'draft' });
      setCurrentImages([]);
      setLinkedOptionGroups([]);
      setWeightGrams(''); setDimLength(''); setDimWidth(''); setDimHeight('');
      setLinkedFiles([]);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleImagesSelected = (selected: StoreImage[]) => {
    const newImages: ProductImage[] = selected.map((img, idx) => ({
      url: img.url,
      alt: img.alt || '',
      sort_order: currentImages.length + idx + 1,
    }));
    // Merge: keep existing that aren't in new selection, add new ones
    const existingUrls = new Set(currentImages.map(i => i.url));
    const toAdd = newImages.filter(i => !existingUrls.has(i.url));
    setCurrentImages([...currentImages, ...toAdd]);
    setShowImagePicker(false);
  };

  const handleRemoveImage = (url: string) => {
    setCurrentImages(currentImages.filter(img => img.url !== url));
  };

  const handleEdit = async (prod: Product) => {
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
    setWeightGrams(prod.weight_grams ? String(prod.weight_grams) : '');
    if (prod.dimensions) {
      setDimLength(String(prod.dimensions.length_mm || ''));
      setDimWidth(String(prod.dimensions.width_mm || ''));
      setDimHeight(String(prod.dimensions.height_mm || ''));
    } else {
      setDimLength(''); setDimWidth(''); setDimHeight('');
    }
    setShowForm(true);

    // Fetch linked option groups and files
    try {
      const [linked, files] = await Promise.all([
        products.getOptions(prod.id),
        productFiles.list(prod.id),
      ]);
      setLinkedOptionGroups(linked);
      setLinkedFiles(files);
    } catch {
      setLinkedOptionGroups([]);
      setLinkedFiles([]);
    }
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

  const handleAddOptionGroup = async (optionGroupId: string) => {
    if (!editingId) return;
    try {
      await products.addOption(editingId, optionGroupId);
      const linked = await products.getOptions(editingId);
      setLinkedOptionGroups(linked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add option group');
    }
  };

  const handleRemoveOptionGroup = async (optionGroupId: string) => {
    if (!editingId) return;
    try {
      await products.removeOption(editingId, optionGroupId);
      setLinkedOptionGroups(linkedOptionGroups.filter(og => og.id !== optionGroupId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove option group');
    }
  };

  const handleAddUrlFile = async () => {
    if (!editingId || !newFileTitle.trim() || !newFileUrl.trim()) return;
    try {
      const file = await productFiles.create(editingId, {
        title: newFileTitle.trim(),
        type: 'url',
        url: newFileUrl.trim(),
        sort_order: linkedFiles.length + 1,
      });
      setLinkedFiles([...linkedFiles, file]);
      setNewFileTitle(''); setNewFileUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add file');
    }
  };

  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (!newFileTitle.trim()) {
      setError('Enter a title before uploading the PDF');
      return;
    }
    setFileUploading(true);
    try {
      const { url } = await productFiles.uploadPdf(file);
      const created = await productFiles.create(editingId, {
        title: newFileTitle.trim(),
        type: 'pdf',
        url,
        sort_order: linkedFiles.length + 1,
      });
      setLinkedFiles([...linkedFiles, created]);
      setNewFileTitle('');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF');
    } finally {
      setFileUploading(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await productFiles.delete(fileId);
      setLinkedFiles(linkedFiles.filter(f => f.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove file');
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
              Weight (grams)
              <input
                type="number"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                placeholder="e.g. 85"
                min="0"
              />
            </label>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Dimensions (mm)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" value={dimLength} onChange={(e) => setDimLength(e.target.value)} placeholder="Length" min="0" style={{ flex: 1 }} />
                <input type="number" value={dimWidth} onChange={(e) => setDimWidth(e.target.value)} placeholder="Width" min="0" style={{ flex: 1 }} />
                <input type="number" value={dimHeight} onChange={(e) => setDimHeight(e.target.value)} placeholder="Height" min="0" style={{ flex: 1 }} />
              </div>
              <small>L × W × H in millimetres</small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Images</label>
              <button type="button" onClick={() => setShowImagePicker(true)}>
                Add Images
              </button>
              {currentImages.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {currentImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img
                        src={`${API_BASE}${img.url}`}
                        alt={img.alt || ''}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.url)}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          lineHeight: '1',
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button type="submit">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setCurrentImages([]); setLinkedOptionGroups([]); setShowImagePicker(false); setWeightGrams(''); setDimLength(''); setDimWidth(''); setDimHeight(''); setLinkedFiles([]); setNewFileTitle(''); setNewFileUrl(''); }}>
                Cancel
              </button>
            </div>
          </form>

          {editingId && (
            <div className="form-card" style={{ width: '300px' }}>
              <h3>Option Groups</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                Link option groups to let customers configure this product.
              </p>

              {linkedOptionGroups.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Linked:</strong>
                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
                    {linkedOptionGroups.map((og) => (
                      <li key={og.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span>{og.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionGroup(og.id)}
                          className="danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {allOptionGroups.filter(og => !linkedOptionGroups.find(l => l.id === og.id)).length > 0 && (
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>Available:</strong>
                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
                    {allOptionGroups
                      .filter(og => !linkedOptionGroups.find(l => l.id === og.id))
                      .map((og) => (
                        <li key={og.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span>{og.name}</span>
                          <button
                            type="button"
                            onClick={() => handleAddOptionGroup(og.id)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Add
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {allOptionGroups.length === 0 && (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>
                  No option groups created yet. Create some in the Option Groups page first.
                </p>
              )}
            </div>
          )}

          {editingId && (
            <div className="form-card" style={{ width: '300px' }}>
              <h3>Files</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                Attach datasheets (PDF) or reference URLs to this product.
              </p>

              {linkedFiles.length > 0 && (
                <ul style={{ margin: '0 0 1rem', paddingLeft: 0, listStyle: 'none' }}>
                  {linkedFiles.map((f) => (
                    <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                        <span style={{ fontSize: '0.75rem', color: f.type === 'pdf' ? '#d97706' : '#2563eb' }}>{f.type.toUpperCase()}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveFile(f.id)} className="danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flexShrink: 0 }}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Title (e.g. Datasheet)"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="fileType" checked={newFileType === 'url'} onChange={() => setNewFileType('url')} /> URL
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="fileType" checked={newFileType === 'pdf'} onChange={() => setNewFileType('pdf')} /> PDF
                  </label>
                </div>
                {newFileType === 'url' ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="url" placeholder="https://..." value={newFileUrl} onChange={(e) => setNewFileUrl(e.target.value)} style={{ flex: 1 }} />
                    <button type="button" onClick={handleAddUrlFile} disabled={!newFileTitle.trim() || !newFileUrl.trim()}>Add</button>
                  </div>
                ) : (
                  <div>
                    <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handlePdfSelected} disabled={fileUploading || !newFileTitle.trim()} style={{ width: '100%' }} />
                    {!newFileTitle.trim() && <small style={{ color: '#888' }}>Enter a title first</small>}
                    {fileUploading && <small>Uploading…</small>}
                  </div>
                )}
              </div>
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

      <ImagePickerModal
        open={showImagePicker}
        multi
        selected={currentImages.map(i => i.url)}
        onConfirm={handleImagesSelected}
        onClose={() => setShowImagePicker(false)}
      />
    </div>
  );
}
