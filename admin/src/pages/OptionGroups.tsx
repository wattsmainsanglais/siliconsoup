import { useEffect, useState } from 'react';
import { optionGroups, optionValues } from '../api/client';
import type { OptionGroup, CreateOptionGroupRequest, CreateOptionValueRequest } from '../api/types';

export default function OptionGroups() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Option Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<CreateOptionGroupRequest>({
    name: '',
    display_name: '',
    type: 'select',
  });

  // Option Value form
  const [showValueForm, setShowValueForm] = useState(false);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState<CreateOptionValueRequest>({
    option_group_id: '',
    value: '',
    display_name: '',
    price_modifier_pence: 0,
    sort_order: 0,
  });

  // Track option groups in local state
  // Note: We'd need a GET /api/admin/option-groups endpoint to persist across reloads
  const [groups, setGroups] = useState<OptionGroup[]>([]);

  const loadData = async () => {
    // Option groups don't have a list endpoint yet
    // For now, groups are only tracked in local state during this session
    setLoading(false);
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
      setGroupForm({ name: '', display_name: '', type: 'select' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleGroupEdit = (group: OptionGroup) => {
    setGroupForm({
      name: group.name,
      display_name: group.display_name,
      type: group.type,
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
      setValueForm({ option_group_id: '', value: '', display_name: '', price_modifier_pence: 0, sort_order: 0 });
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
            Internal Name
            <input
              type="text"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="e.g., antenna_size"
              required
            />
          </label>
          <label>
            Display Name
            <input
              type="text"
              value={groupForm.display_name}
              onChange={(e) => setGroupForm({ ...groupForm, display_name: e.target.value })}
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
              value={valueForm.display_name}
              onChange={(e) => setValueForm({ ...valueForm, display_name: e.target.value })}
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
                <h3>{group.display_name}</h3>
                <small>Internal: {group.name} | Type: {group.type}</small>
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
                    <th>Display Name</th>
                    <th>Price Modifier</th>
                    <th>Sort</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.values.map((val) => (
                    <tr key={val.id}>
                      <td>{val.value}</td>
                      <td>{val.display_name}</td>
                      <td>{formatPrice(val.price_modifier_pence)}</td>
                      <td>{val.sort_order}</td>
                      <td>
                        <button onClick={() => {
                          setValueForm({
                            option_group_id: group.id,
                            value: val.value,
                            display_name: val.display_name,
                            price_modifier_pence: val.price_modifier_pence,
                            sort_order: val.sort_order,
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
    </div>
  );
}
