import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReservation, getAvailableTables } from '../api/api';
import {
  TIME_SLOTS,
  getTodayDate,
  LOCATION_LABELS,
  getErrorMessage,
} from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineClipboardList,
} from 'react-icons/hi';

const CreateReservation = () => {
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    timeSlot: '',
    guests: 2,
    tableId: '',
    specialRequests: '',
  });
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Fetch available tables whenever date, timeSlot, or guests change
  useEffect(() => {
    if (formData.date && formData.timeSlot && formData.guests) {
      fetchAvailableTables();
    } else {
      setAvailableTables([]);
    }
  }, [formData.date, formData.timeSlot, formData.guests]);

  const fetchAvailableTables = async () => {
    setLoadingTables(true);
    try {
      const res = await getAvailableTables(
        formData.date,
        formData.timeSlot,
        formData.guests
      );
      setAvailableTables(res.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setAvailableTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset table selection when key params change
      ...(name !== 'tableId' && name !== 'specialRequests' ? { tableId: '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        date: formData.date,
        timeSlot: formData.timeSlot,
        guests: parseInt(formData.guests, 10),
        specialRequests: formData.specialRequests,
      };
      // Include tableId only if user specifically picked one
      if (formData.tableId) {
        payload.tableId = formData.tableId;
      }

      await createReservation(payload);
      toast.success('Reservation created successfully!');
      navigate('/reservations');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Book a Table</h1>
        <p>Select your preferred date, time, and party size</p>
      </div>

      <form onSubmit={handleSubmit} className="reservation-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="res-date">
              <HiOutlineCalendar /> Date
            </label>
            <input
              type="date"
              id="res-date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              min={getTodayDate()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="res-timeslot">
              <HiOutlineClock /> Time Slot
            </label>
            <select
              id="res-timeslot"
              name="timeSlot"
              value={formData.timeSlot}
              onChange={handleChange}
              required
            >
              <option value="">Select a time slot</option>
              {TIME_SLOTS.map((slot) => {
                // Disable past time slots for today
                const isToday = formData.date === getTodayDate();
                let disabled = false;
                if (isToday) {
                  const now = new Date();
                  const [h, m] = slot.split('-')[0].split(':').map(Number);
                  const slotStart = new Date();
                  slotStart.setHours(h, m, 0, 0);
                  disabled = now >= slotStart;
                }
                return (
                  <option key={slot} value={slot} disabled={disabled}>
                    {slot}{disabled ? ' (passed)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="res-guests">
              <HiOutlineUserGroup /> Guests
            </label>
            <input
              type="number"
              id="res-guests"
              name="guests"
              value={formData.guests}
              onChange={handleChange}
              min={1}
              max={20}
              required
            />
          </div>
        </div>

        {/* Available Tables Section */}
        {formData.timeSlot && (
          <div className="available-tables-section">
            <h3>
              Available Tables
              {loadingTables && <span className="loading-dot">...</span>}
            </h3>

            {!loadingTables && availableTables.length === 0 && (
              <div className="no-tables-msg">
                <p>No tables available for this selection. Try a different date or time.</p>
              </div>
            )}

            {availableTables.length > 0 && (
              <div className="table-grid">
                {availableTables.map((table) => (
                  <label
                    key={table._id}
                    className={`table-card ${formData.tableId === table._id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="tableId"
                      value={table._id}
                      checked={formData.tableId === table._id}
                      onChange={handleChange}
                    />
                    <div className="table-card-content">
                      <span className="table-number">Table {table.tableNumber}</span>
                      <span className="table-capacity">{table.capacity} seats</span>
                      <span className="table-location">
                        {LOCATION_LABELS[table.location] || table.location}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="table-note">
              💡 Leave unselected for auto-assignment of the best-fit table.
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="res-special">
            <HiOutlineClipboardList /> Special Requests (optional)
          </label>
          <textarea
            id="res-special"
            name="specialRequests"
            value={formData.specialRequests}
            onChange={handleChange}
            placeholder="Any dietary requirements, celebrations, preferences..."
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/reservations')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !formData.timeSlot}
          >
            {submitting ? 'Booking...' : 'Confirm Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReservation;
