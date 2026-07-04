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
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
} from 'react-icons/hi';

const CreateReservation = () => {
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    timeSlot: '',
    guests: 2,
    isShared: false,
    specialRequests: '',
  });
  const [availableTables, setAvailableTables] = useState([]);
  const [needsMultiTable, setNeedsMultiTable] = useState(false);
  const [suggestedTableIds, setSuggestedTableIds] = useState([]);
  const [selectedTableIds, setSelectedTableIds] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const guestCount = parseInt(formData.guests, 10) || 0;

  // Fetch available tables whenever date, timeSlot, guests, or isShared change
  useEffect(() => {
    if (formData.date && formData.timeSlot && formData.guests) {
      fetchAvailableTables();
    } else {
      setAvailableTables([]);
      setNeedsMultiTable(false);
      setSuggestedTableIds([]);
    }
    setSelectedTableIds([]);
  }, [formData.date, formData.timeSlot, formData.guests, formData.isShared]);

  const fetchAvailableTables = async () => {
    setLoadingTables(true);
    try {
      const res = await getAvailableTables(
        formData.date,
        formData.timeSlot,
        formData.guests,
        formData.isShared
      );
      setAvailableTables(res.data.data);
      setNeedsMultiTable(res.data.needsMultiTable);
      setSuggestedTableIds(res.data.suggestedTableIds || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setAvailableTables([]);
      setNeedsMultiTable(false);
      setSuggestedTableIds([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Toggle table selection (checkbox mode for multi-table, radio for single)
  const handleTableToggle = (tableId) => {
    if (needsMultiTable) {
      // Checkbox: toggle selection
      setSelectedTableIds((prev) =>
        prev.includes(tableId)
          ? prev.filter((id) => id !== tableId)
          : [...prev, tableId]
      );
    } else {
      // Radio: single select
      setSelectedTableIds((prev) =>
        prev[0] === tableId ? [] : [tableId]
      );
    }
  };

  // Apply the suggested combination
  const applySuggestion = () => {
    setSelectedTableIds([...suggestedTableIds]);
  };

  const getRemainingCapacity = (table) => {
    if (table.currentOccupancy !== undefined) {
      return table.capacity - table.currentOccupancy;
    }
    return table.capacity;
  };

  // Calculate combined capacity of selected tables
  const selectedCapacity = selectedTableIds.reduce((sum, id) => {
    const table = availableTables.find((t) => t._id === id);
    return sum + (table ? getRemainingCapacity(table) : 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        date: formData.date,
        timeSlot: formData.timeSlot,
        guests: guestCount,
        isShared: formData.isShared,
        specialRequests: formData.specialRequests,
      };

      if (selectedTableIds.length > 0) {
        payload.tableIds = selectedTableIds;
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

  // Tables that fit a single party
  const singleFitTables = availableTables.filter((t) => t.capacity >= guestCount);

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

          <div className="form-group checkbox-group" style={{ gridColumn: 'span 3', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <input
              type="checkbox"
              id="res-shared"
              name="isShared"
              checked={formData.isShared}
              onChange={handleChange}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="res-shared" style={{ marginBottom: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', fontWeight: 600 }}>
              Allow table sharing with other guests (Shared Table)
            </label>
          </div>
        </div>

        {/* Available Tables Section */}
        {formData.timeSlot && (
          <div className="available-tables-section">
            <h3>
              Available Tables
              {loadingTables && <span className="loading-dot">...</span>}
            </h3>

            {/* Multi-table alert banner */}
            {!loadingTables && needsMultiTable && availableTables.length > 0 && (
              <div className="multi-table-alert">
                <div className="multi-table-alert-icon">
                  <HiOutlineExclamationCircle />
                </div>
                <div className="multi-table-alert-content">
                  <p className="multi-table-alert-title">
                    No single table can seat {guestCount} guest{guestCount !== 1 ? 's' : ''}
                  </p>
                  <p className="multi-table-alert-sub">
                    The largest available table has {Math.max(...availableTables.map((t) => getRemainingCapacity(t)))} remaining seats.
                    Select multiple tables below to accommodate your party.
                  </p>
                  {suggestedTableIds.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={applySuggestion}
                      style={{ marginTop: '10px' }}
                    >
                      <HiOutlineInformationCircle /> Use Recommended Combination
                    </button>
                  )}
                </div>
              </div>
            )}

            {!loadingTables && availableTables.length === 0 && (
              <div className="no-tables-msg">
                <p>No tables available for this selection. Try a different date or time.</p>
              </div>
            )}

            {availableTables.length > 0 && (
              <>
                <div className="table-grid">
                  {availableTables.map((table) => {
                    const isSelected = selectedTableIds.includes(table._id);
                    const remainingCap = getRemainingCapacity(table);
                    const tooSmall = !needsMultiTable && remainingCap < guestCount;
                    return (
                      <label
                        key={table._id}
                        className={`table-card ${isSelected ? 'selected' : ''} ${tooSmall ? 'too-small' : ''}`}
                      >
                        <input
                          type="checkbox"
                          value={table._id}
                          checked={isSelected}
                          onChange={() => handleTableToggle(table._id)}
                          disabled={tooSmall}
                          style={{ display: 'none' }}
                        />
                        <div className="table-card-content">
                          <span className="table-number">Table {table.tableNumber}</span>
                          <span className="table-capacity">
                            {table.currentOccupancy !== undefined
                              ? `${remainingCap} of ${table.capacity} seats left`
                              : `${table.capacity} seats`}
                          </span>
                          <span className="table-location">
                            {LOCATION_LABELS[table.location] || table.location}
                          </span>
                          {table.currentOccupancy !== undefined && (
                            <span className="table-shared-badge">Shared</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Selected capacity indicator for multi-table */}
                {needsMultiTable && selectedTableIds.length > 0 && (
                  <div className={`capacity-indicator ${selectedCapacity >= guestCount ? 'sufficient' : 'insufficient'}`}>
                    <span>
                      Combined capacity: <strong>{selectedCapacity}</strong> seats
                      ({selectedTableIds.length} table{selectedTableIds.length !== 1 ? 's' : ''})
                    </span>
                    <span className="capacity-vs">
                      {selectedCapacity >= guestCount
                        ? `✓ Fits ${guestCount} guest${guestCount !== 1 ? 's' : ''}`
                        : `✗ Need ${guestCount - selectedCapacity} more seat${guestCount - selectedCapacity !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}

                {!needsMultiTable && (
                  <p className="table-note">
                    💡 Leave unselected for auto-assignment of the best-fit table.
                  </p>
                )}
              </>
            )}
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
            disabled={
              submitting ||
              !formData.timeSlot ||
              (needsMultiTable && selectedCapacity < guestCount)
            }
          >
            {submitting ? 'Booking...' : needsMultiTable ? `Book ${selectedTableIds.length} Table${selectedTableIds.length !== 1 ? 's' : ''}` : 'Confirm Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReservation;
