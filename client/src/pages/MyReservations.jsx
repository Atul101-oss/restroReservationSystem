import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyReservations, cancelMyReservation } from '../api/api';
import { formatDate, LOCATION_LABELS, STATUS_STYLES, getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';
import { HiOutlinePlusCircle, HiOutlineXCircle, HiOutlineCalendar, HiOutlineClock, HiOutlineUserGroup } from 'react-icons/hi';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchReservations(); }, []);

  const fetchReservations = async () => {
    try {
      const res = await getMyReservations();
      setReservations(res.data.data);
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      await cancelMyReservation(id);
      toast.success('Reservation cancelled');
      fetchReservations();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const filtered = reservations.filter((r) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(r.date);
    if (filter === 'upcoming') return r.status === 'confirmed' && d >= today;
    if (filter === 'past') return d < today;
    if (filter === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1>My Reservations</h1><p>{reservations.length} total</p></div>
        <Link to="/reservations/new" className="btn btn-primary"><HiOutlinePlusCircle /> Book Table</Link>
      </div>
      <div className="filter-bar">
        {['all','upcoming','past','cancelled'].map(f=>(
          <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><HiOutlineCalendar className="empty-icon"/><h3>No reservations found</h3>
          {filter==='all' && <Link to="/reservations/new" className="btn btn-primary">Book Your First Table</Link>}
        </div>
      ) : (
        <div className="reservations-list">
          {filtered.map((r) => {
            const style = STATUS_STYLES[r.status];
            const isPast = new Date(r.date) < new Date();
            return (
              <div key={r._id} className={`reservation-card ${r.status}`}>
                <div className="reservation-card-header">
                  <div className="reservation-table-info">
                    <span className="table-badge">Table {r.table?.tableNumber||'N/A'}</span>
                    <span className="location-badge">{LOCATION_LABELS[r.table?.location]||''}</span>
                  </div>
                  <span className="status-badge" style={{backgroundColor:style.bg,color:style.color}}>{style.label}</span>
                </div>
                <div className="reservation-card-body">
                  <div className="reservation-detail"><HiOutlineCalendar/><span>{formatDate(r.date)}</span></div>
                  <div className="reservation-detail"><HiOutlineClock/><span>{r.timeSlot}</span></div>
                  <div className="reservation-detail"><HiOutlineUserGroup/><span>{r.guests} guest(s)</span></div>
                </div>
                {r.specialRequests && <div className="reservation-special"><em>"{r.specialRequests}"</em></div>}
                {r.status==='confirmed' && !isPast && (
                  <div className="reservation-card-actions">
                    <button className="btn btn-danger btn-sm" onClick={()=>handleCancel(r._id)}><HiOutlineXCircle/> Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyReservations;
