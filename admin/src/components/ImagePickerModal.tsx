import { useEffect, useState, useRef } from 'react';
import { imageStore } from '../api/client';
import type { StoreImage } from '../api/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ImagePickerModalProps {
  open: boolean;
  multi?: boolean;
  selected?: string[]; // currently selected URLs
  onConfirm: (images: StoreImage[]) => void;
  onClose: () => void;
}

export default function ImagePickerModal({ open, multi = false, selected = [], onConfirm, onClose }: ImagePickerModalProps) {
  const [images, setImages] = useState<StoreImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setError(null);
    loadImages();
  }, [open]);

  // Pre-select images that match the currently selected URLs
  useEffect(() => {
    if (images.length > 0 && selected.length > 0) {
      const ids = new Set<string>();
      for (const img of images) {
        if (selected.includes(img.url)) {
          ids.add(img.id);
        }
      }
      setSelectedIds(ids);
    }
  }, [images, selected]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await imageStore.list();
      setImages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const img = await imageStore.upload(file);
        setImages(prev => [img, ...prev]);
        // Auto-select newly uploaded images
        setSelectedIds(prev => new Set(prev).add(img.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multi) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = images.filter(img => selectedIds.has(img.id));
    onConfirm(selected);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{multi ? 'Select Images' : 'Select Image'}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
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
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
          {error && <p className="error">{error}</p>}

          {loading ? (
            <p>Loading images...</p>
          ) : images.length === 0 ? (
            <p style={{ color: '#666' }}>No images yet. Upload some using the button above.</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.75rem',
            }}>
              {images.map((img) => {
                const isSelected = selectedIds.has(img.id);
                return (
                  <div
                    key={img.id}
                    onClick={() => toggleSelect(img.id)}
                    style={{
                      border: isSelected ? '3px solid #2563eb' : '2px solid #ddd',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      opacity: isSelected ? 1 : 0.75,
                      transition: 'all 0.15s',
                    }}
                  >
                    <img
                      src={`${API_BASE}${img.url}`}
                      alt={img.alt || img.filename}
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <small style={{
                      display: 'block',
                      padding: '0.25rem 0.4rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.7rem',
                    }}>
                      {img.filename}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <small style={{ color: '#666' }}>{selectedIds.size} selected</small>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              style={{ background: '#2563eb', color: 'white', border: 'none' }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
