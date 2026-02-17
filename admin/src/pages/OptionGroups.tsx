import { useEffect, useState } from 'react';
import { optionGroups, optionValues } from '../api/client';
import type { OptionGroup, CreateOptionGroupRequest, CreateOptionValueRequest, StoreImage } from '../api/types';
import ImagePickerModal from '../components/ImagePickerModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function OptionGroups() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Option Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<CreateOptionGroupRequest>({
    name: '',
    type: 'select',
    required: false,
  });

  // Option Value form
  const [showValueForm, setShowValueForm] = useState(false);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState<CreateOptionValueRequest>({
    option_group_id: '',
    value: '',
    label: '',
    price_modifier_pence: 0,
    sort_order: 0,
    image: '',
  });

  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const loadData = async () => {
    try {
      const data = await optionGroups.list();
      setGroups(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load option groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroupId) {
        const updated = await optionGroups.update(editingGroupId, groupForm);
        setGroups(groups.map(g => g.id === editingGroupId ? updated : g));
      } else {
        const created = await optionGroups.create(groupForm);
        setGroups([...groups, created]);
      }
      setShowGroupForm(false);
      setEditingGroupId(null);
      setGroupForm({ name: '', type: 'select', required: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleGroupEdit = (group: OptionGroup) => {
    setGroupForm({
      name: group.name,
      type: group.type,
      required: group.required,
    });
    setEditingGroupId(group.id);
    setShowGroupForm(true);
  };

  const handleGroupDelete = async (id: string) => {
    if (!confirm('Delete this option group and all its values?')) return;
    try {
      await optionGroups.delete(id);
      setGroups(groups.filter(g => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleValueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    try {
      const data = { ...valueForm, option_group_id: selectedGroupId };
      if (editingValueId) {
        const updated = await optionValues.update(editingValueId, data);
        setGroups(groups.map(g => {
          if (g.id === selectedGroupId) {
            return {
              ...g,
              values: g.values?.map(v => v.id === editingValueId ? updated : v),
            };
          }
          return g;
        }));
      } else {
        const created = await optionValues.create(data);
        setGroups(groups.map(g => {
          if (g.id === selectedGroupId) {
            return {
              ...g,
              values: [...(g.values || []), created],
            };
          }
          return g;
        }));
      }
      setShowValueForm(false);
      setEditingValueId(null);
      setValueForm({ option_group_id: '', value: '', label: '', price_modifier_pence: 0, sort_order: 0, image: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleValueDelete = async (groupId: string, valueId: string) => {
    if (!confirm('Delete this option value?')) return;
    try {
      await optionValues.delete(valueId);
      setGroups(groups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            values: g.values?.filter(v => v.id !== valueId),
          };
        }
        return g;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const formatPrice = (pence: number) => {
    if (pence === 0) return '-';
    const sign = pence > 0 ? '+' : '';
    return `${sign}£${(pence / 100).toFixed(2)}`;
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Option Groups</h2>
        <button onClick={() => setShowGroupForm(true)}>Add Option Group</button>
      </div>

      {error && <p className="error">{error}</p>}

      <p className="hint">
        Option groups define configurable attributes (e.g., "Antenna Size", "Cable Length").
        Each group has values with optional price modifiers.
      </p>

      {showGroupForm && (
        <form onSubmit={handleGroupSubmit} className="form-card">
          <h3>{editingGroupId ? 'Edit Option Group' : 'New Option Group'}</h3>
          <label>
            Name
            <input
              type="text"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="e.g., Antenna Size"
              required
            />
          </label>
          <label>
            Type
            <select
              value={groupForm.type}
              onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value })}
            >
              <option value="select">Select (single choice)</option>
              <option value="multiselect">Multi-select</option>
              <option value="text">Text input</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={groupForm.required}
              onChange={(e) => setGroupForm({ ...groupForm, required: e.target.checked })}
            />
            Required
          </label>
          <div className="form-actions">
            <button type="submit">{editingGroupId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => { setShowGroupForm(false); setEditingGroupId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {showValueForm && selectedGroupId && (
        <form onSubmit={handleValueSubmit} className="form-card">
          <h3>{editingValueId ? 'Edit Value' : 'Add Value'}</h3>
          <label>
            Value (internal)
            <input
              type="text"
              value={valueForm.value}
              onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })}
              placeholder="e.g., 65mm"
              required
            />
          </label>
          <label>
            Display Name
            <input
              type="text"
              value={valueForm.label}
              onChange={(e) => setValueForm({ ...valueForm, label: e.target.value })}
              placeholder="e.g., 65mm Antenna"
              required
            />
          </label>
          <label>
            Price Modifier (pence)
            <input
              type="number"
              value={valueForm.price_modifier_pence}
              onChange={(e) => setValueForm({ ...valueForm, price_modifier_pence: Number(e.target.value) })}
            />
            <small>e.g., 600 = +£6.00, -200 = -£2.00</small>
          </label>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Image (optional)</label>
            <button type="button" onClick={() => setShowImagePicker(true)}>
              {valueForm.image ? 'Change Image' : 'Select Image'}
            </button>
            {valueForm.image && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.5rem' }}>
                <img
                  src={`${API_BASE}${valueForm.image}`}
                  alt=""
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button
                  type="button"
                  onClick={() => setValueForm({ ...valueForm, image: null })}
                  style={{
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
                  title="Clear"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <label>
            Sort Order
            <input
              type="number"
              value={valueForm.sort_order}
              onChange={(e) => setValueForm({ ...valueForm, sort_order: Number(e.target.value) })}
            />
          </label>
          <div className="form-actions">
            <button type="submit">{editingValueId ? 'Update' : 'Add'}</button>
            <button type="button" onClick={() => { setShowValueForm(false); setEditingValueId(null); setSelectedGroupId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <p>No option groups yet. Create one to define product variants.</p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="option-group-card">
            <div className="option-group-header">
              <div>
                <h3>{group.name}</h3>
                <small>Type: {group.type} | {group.required ? 'Required' : 'Optional'}</small>
              </div>
              <div>
                <button onClick={() => { setSelectedGroupId(group.id); setShowValueForm(true); }}>
                  Add Value
                </button>
                <button onClick={() => handleGroupEdit(group)}>Edit</button>
                <button onClick={() => handleGroupDelete(group.id)} className="danger">Delete</button>
              </div>
            </div>
            {group.values && group.values.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Value</th>
                    <th>Label</th>
                    <th>Price Modifier</th>
                    <th>Image</th>
                    <th>Sort</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.values.map((val) => (
                    <tr key={val.id}>
                      <td>{val.value}</td>
                      <td>{val.label}</td>
                      <td>{formatPrice(val.price_modifier_pence)}</td>
                      <td>{val.image ? <img src={`${API_BASE}${val.image}`} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} /> : '-'}</td>
                      <td>{val.sort_order}</td>
                      <td>
                        <button onClick={() => {
                          setValueForm({
                            option_group_id: group.id,
                            value: val.value,
                            label: val.label,
                            price_modifier_pence: val.price_modifier_pence,
                            sort_order: val.sort_order,
                            image: val.image || '',
                          });
                          setEditingValueId(val.id);
                          setSelectedGroupId(group.id);
                          setShowValueForm(true);
                        }}>Edit</button>
                        <button onClick={() => handleValueDelete(group.id, val.id)} className="danger">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="hint">No values yet</p>
            )}
          </div>
        ))
      )}

      <ImagePickerModal
        open={showImagePicker}
        multi={false}
        selected={valueForm.image ? [valueForm.image] : []}
        onConfirm={(selected: StoreImage[]) => {
          if (selected.length > 0) {
            setValueForm({ ...valueForm, image: selected[0].url });
          }
          setShowImagePicker(false);
        }}
        onClose={() => setShowImagePicker(false)}
      />
    </div>
  );
}
