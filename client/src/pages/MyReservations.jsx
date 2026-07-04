import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyReservations, cancelMyReservation } from '../api/api';
import { formatDate, LOCATION_LABELS, STATUS_STYLES, getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';
import { HiOutlinePlusCircle, HiOutlineXCircle, HiOutlineCalendar, HiOutlineClock, HiOutlineUserGroup, HiOutlineExclamationCircle, HiOutlineCheckCircle } from 'react-icons/hi';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { fetchReservations(); }, []);

  const fetchReservations = async () => {
    try {
      const res = await getMyReservations();
      setReservations(res.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!confirmCancelId) return;
    setCancelling(true);
    try {
      await cancelMyReservation(confirmCancelId);
      toast.success('Reservation cancelled successfully');
      setConfirmCancelId(null);
      fetchReservations();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  };

  // Helper: check if a reservation's time slot has already passed
  const isReservationPast = (r) => {
    const now = new Date();
    const rDate = new Date(r.date);
    rDate.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (rDate < todayStart) return true; // past day

    if (rDate.getTime() === todayStart.getTime()) {
      // Same day — check if the time slot has already ended
      const endTime = r.timeSlot?.split('-')[1]; // e.g. "17:00"
      if (endTime) {
        const [h, m] = endTime.split(':').map(Number);
        const slotEnd = new Date(todayStart);
        slotEnd.setHours(h, m, 0, 0);
        return now >= slotEnd;
      }
    }
    return false;
  };

  const filtered = reservations.filter((r) => {
    if (filter === 'upcoming') return r.status === 'confirmed' && !isReservationPast(r);
    if (filter === 'past') return isReservationPast(r);
    if (filter === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Reservations</h1>
          <p>{reservations.length} total reservation{reservations.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/reservations/new" className="btn btn-primary">
          <HiOutlinePlusCircle /> Book a Table
        </Link>
      </div>

      <div className="filter-bar">
        {['all', 'upcoming', 'past', 'cancelled'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <HiOutlineCalendar className="empty-icon" />
          <h3>No reservations found</h3>
          {filter === 'all' && (
            <Link to="/reservations/new" className="btn btn-primary">Book Your First Table</Link>
          )}
        </div>
      ) : (
        <div className="reservations-list">
          {filtered.map((r) => {
            const style = STATUS_STYLES[r.status];
            const isPast = isReservationPast(r);
            const isConfirmingCancel = confirmCancelId === r._id;

            const tableNumbers = r.tables && r.tables.length > 0
              ? r.tables.map((t) => t.tableNumber).join(', ')
              : 'N/A';
            const tableLocations = r.tables && r.tables.length > 0
              ? [...new Set(r.tables.map((t) => LOCATION_LABELS[t.location] || t.location))].join(', ')
              : '';

            return (
              <div
                key={r._id}
                className={`reservation-card ${r.status} ${isConfirmingCancel ? 'confirming-cancel' : ''}`}
              >
                <div className="reservation-card-header">
                  <div className="reservation-table-info">
                    <span className="table-badge">Table{r.tables && r.tables.length > 1 ? 's' : ''} {tableNumbers}</span>
                    {tableLocations && <span className="location-badge">{tableLocations}</span>}
                  </div>
                  <span className="status-badge" style={{ backgroundColor: style.bg, color: style.color }}>
                    {style.label}
                  </span>
                </div>

                <div className="reservation-card-body">
                  <div className="reservation-detail"><HiOutlineCalendar /><span>{formatDate(r.date)}</span></div>
                  <div className="reservation-detail"><HiOutlineClock /><span>{r.timeSlot}</span></div>
                  <div className="reservation-detail"><HiOutlineUserGroup /><span>{r.guests} guest{r.guests !== 1 ? 's' : ''}</span></div>
                </div>

                {r.specialRequests && (
                  <div className="reservation-special"><em>&ldquo;{r.specialRequests}&rdquo;</em></div>
                )}

                {/* ── Cancel Confirmation Panel ── */}
                {isConfirmingCancel && (
                  <div className="cancel-confirm-panel">
                    <div className="cancel-confirm-icon">
                      <HiOutlineExclamationCircle />
                    </div>
                    <div className="cancel-confirm-text">
                      <p className="cancel-confirm-title">Cancel this reservation?</p>
                      <p className="cancel-confirm-sub">
                        Table{r.tables && r.tables.length > 1 ? 's' : ''} {tableNumbers} &bull; {formatDate(r.date)} &bull; {r.timeSlot}
                      </p>
                      <p className="cancel-confirm-warn">This action cannot be undone.</p>
                    </div>
                    <div className="cancel-confirm-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmCancelId(null)}
                        disabled={cancelling}
                      >
                        Keep It
                      </button>
                      <button
                        className="btn btn-danger-solid btn-sm"
                        onClick={handleCancelConfirm}
                        disabled={cancelling}
                      >
                        {cancelling ? <><span className="spinner-xs" /> Cancelling…</> : <><HiOutlineXCircle /> Yes, Cancel</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Card Actions ── */}
                {r.status === 'confirmed' && !isPast && (
                  <div className="reservation-card-actions">
                    {!isConfirmingCancel && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmCancelId(r._id)}
                      >
                        <HiOutlineXCircle /> Cancel Booking
                      </button>
                    )}
                  </div>
                )}

                {/* ── Cancelled Badge ── */}
                {r.status === 'cancelled' && (
                  <div className="cancelled-notice">
                    <HiOutlineCheckCircle /> This reservation was cancelled.
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
