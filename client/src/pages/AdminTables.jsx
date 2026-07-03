import { useState, useEffect } from 'react';
import { getTables, createTable, updateTable, deleteTable } from '../api/api';
import { LOCATION_LABELS, getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';
import { HiOutlinePlusCircle, HiOutlinePencil, HiOutlineTrash, HiOutlineViewGrid } from 'react-icons/hi';

const AdminTables = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ tableNumber: '', capacity: 2, location: 'indoor' });

  useEffect(() => { fetchTables(); }, []);

  const fetchTables = async () => {
    try { const res = await getTables(); setTables(res.data.data); }
    catch (error) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setFormData({ tableNumber: '', capacity: 2, location: 'indoor' }); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTable(editingId, formData);
        toast.success('Table updated');
      } else {
        await createTable({ ...formData, tableNumber: parseInt(formData.tableNumber) });
        toast.success('Table created');
      }
      resetForm();
      fetchTables();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const startEdit = (t) => {
    setEditingId(t._id);
    setFormData({ tableNumber: t.tableNumber, capacity: t.capacity, location: t.location });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this table? This cannot be undone.')) return;
    try { await deleteTable(id); toast.success('Table deleted'); fetchTables(); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1>Table Management</h1><p className="admin-badge">Admin Panel</p></div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <HiOutlinePlusCircle /> {showForm ? 'Close Form' : 'Add Table'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Table Number</label>
              <input type="number" min={1} value={formData.tableNumber} onChange={e=>setFormData({...formData,tableNumber:e.target.value})} required disabled={!!editingId} />
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input type="number" min={1} max={20} value={formData.capacity} onChange={e=>setFormData({...formData,capacity:parseInt(e.target.value)})} required />
            </div>
            <div className="form-group">
              <label>Location</label>
              <select value={formData.location} onChange={e=>setFormData({...formData,location:e.target.value})}>
                {Object.entries(LOCATION_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'} Table</button>
          </div>
        </form>
      )}

      {tables.length === 0 ? (
        <div className="empty-state"><HiOutlineViewGrid className="empty-icon"/><h3>No tables configured</h3><p>Add tables to get started.</p></div>
      ) : (
        <div className="table-management-grid">
          {tables.map(t => (
            <div key={t._id} className={`manage-table-card ${!t.isActive?'inactive':''}`}>
              <div className="manage-table-header">
                <h3>Table {t.tableNumber}</h3>
                <div className="action-btns">
                  <button className="btn btn-secondary btn-sm" onClick={()=>startEdit(t)} title="Edit"><HiOutlinePencil/></button>
                  <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(t._id)} title="Delete"><HiOutlineTrash/></button>
                </div>
              </div>
              <div className="manage-table-body">
                <p><strong>Capacity:</strong> {t.capacity} seats</p>
                <p><strong>Location:</strong> {LOCATION_LABELS[t.location]||t.location}</p>
                <p><strong>Status:</strong> {t.isActive ? '✅ Active' : '❌ Inactive'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTables;
