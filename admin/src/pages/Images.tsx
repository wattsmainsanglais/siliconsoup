import { useEffect, useState, useRef } from 'react';
import { imageStore } from '../api/client';
import type { StoreImage } from '../api/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function Images() {
  const [images, setImages] = useState<StoreImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await imageStore.list();
      setImages(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const img = await imageStore.upload(file);
        setImages(prev => [img, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image? It will also be removed from any products/options using it.')) return;
    try {
      await imageStore.delete(id);
      setImages(images.filter(img => img.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Image Store</h2>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Images'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <p className="hint">
        Upload images here, then pick them when creating products or option values.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          color: '#888',
        }}
      >
        Drag and drop images here, or use the Upload button above
      </div>

      {images.length === 0 ? (
        <p>No images yet. Upload some to get started.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem',
        }}>
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#fafafa',
              }}
            >
              <img
                src={`${API_BASE}${img.url}`}
                alt={img.alt || img.filename}
                style={{
                  width: '100%',
                  height: '140px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <div style={{ padding: '0.5rem' }}>
                <small style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '0.25rem',
                }}>
                  {img.filename}
                </small>
                {img.size_bytes && (
                  <small style={{ color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                    {(img.size_bytes / 1024).toFixed(0)} KB
                  </small>
                )}
                <button
                  onClick={() => handleDelete(img.id)}
                  className="danger"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.3rem' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
