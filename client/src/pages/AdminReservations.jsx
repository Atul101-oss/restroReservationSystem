import { useState, useEffect } from 'react';
import { getAllReservations, deleteReservation, updateReservation } from '../api/api';
import { formatDate, LOCATION_LABELS, STATUS_STYLES, TIME_SLOTS, getErrorMessage, getTodayDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { HiOutlineCalendar, HiOutlineClock, HiOutlineUserGroup, HiOutlineXCircle, HiOutlinePencil, HiOutlineFilter } from 'react-icons/hi';

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => { fetchReservations(); }, [dateFilter, statusFilter]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await getAllReservations(params);
      setReservations(res.data.data);
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      await deleteReservation(id);
      toast.success('Reservation cancelled');
      fetchReservations();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditData({ date: new Date(r.date).toISOString().split('T')[0], timeSlot: r.timeSlot, guests: r.guests, status: r.status });
  };

  const handleUpdate = async (id) => {
    try {
      await updateReservation(id, editData);
      toast.success('Reservation updated');
      setEditingId(null);
      fetchReservations();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1>All Reservations</h1><p className="admin-badge">Admin Panel</p></div>
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <label><HiOutlineFilter /> Filter by Date</label>
          <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} />
          {dateFilter && <button className="btn btn-sm btn-secondary" onClick={()=>setDateFilter('')}>Clear</button>}
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-results"><strong>{reservations.length}</strong> reservation(s) found</div>
      </div>

      {reservations.length === 0 ? (
        <div className="empty-state"><HiOutlineCalendar className="empty-icon"/><h3>No reservations found</h3></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th><th>Table</th><th>Date</th><th>Time</th><th>Guests</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => {
                const style = STATUS_STYLES[r.status];
                const isEditing = editingId === r._id;
                return (
                  <tr key={r._id}>
                    <td><strong>{r.user?.name||'N/A'}</strong><br/><small>{r.user?.email||''}</small></td>
                    <td>
                      Table{r.tables && r.tables.length > 1 ? 's' : ''} {r.tables && r.tables.length > 0 ? r.tables.map(t => t.tableNumber).join(', ') : '?'}
                      {r.isShared && <span className="table-shared-badge" style={{ verticalAlign: 'middle', marginLeft: '6px', marginTop: 0 }}>Shared</span>}
                      <br/>
                      <small>
                        {r.tables && r.tables.length > 0 ? [...new Set(r.tables.map(t => LOCATION_LABELS[t.location] || t.location))].join(', ') : ''} · {r.tables && r.tables.length > 0 ? r.tables.reduce((sum, t) => sum + t.capacity, 0) : 0} seats
                      </small>
                    </td>
                    <td>{isEditing ? <input type="date" value={editData.date} onChange={e=>setEditData({...editData,date:e.target.value})} /> : formatDate(r.date)}</td>
                    <td>{isEditing ? <select value={editData.timeSlot} onChange={e=>setEditData({...editData,timeSlot:e.target.value})}>{TIME_SLOTS.map(s=><option key={s} value={s}>{s}</option>)}</select> : r.timeSlot}</td>
                    <td>{isEditing ? <input type="number" min={1} max={20} value={editData.guests} onChange={e=>setEditData({...editData,guests:parseInt(e.target.value)})} style={{width:'60px'}} /> : r.guests}</td>
                    <td>{isEditing ? <select value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})}><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select> : <span className="status-badge" style={{backgroundColor:style.bg,color:style.color}}>{style.label}</span>}</td>
                    <td>
                      {isEditing ? (
                        <div className="action-btns">
                          <button className="btn btn-primary btn-sm" onClick={()=>handleUpdate(r._id)}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={()=>setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="action-btns">
                          <button className="btn btn-secondary btn-sm" onClick={()=>startEdit(r)} title="Edit"><HiOutlinePencil/></button>
                          {r.status==='confirmed' && <button className="btn btn-danger btn-sm" onClick={()=>handleCancel(r._id)} title="Cancel Reservation"><HiOutlineXCircle/></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReservations;
