/**
 * Format a date string to a readable format
 */
export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date to YYYY-MM-DD for input fields
 */
export const toInputDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Available time slots
 */
export const TIME_SLOTS = [
  '09:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
  '21:00-23:00',
];

/**
 * Table location labels
 */
export const LOCATION_LABELS = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  window: 'Window',
  patio: 'Patio',
  private: 'Private Room',
};

/**
 * Status badge colors
 */
export const STATUS_STYLES = {
  confirmed: { bg: '#dcfce7', color: '#166534', label: 'Confirmed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

/**
 * Extract error message from API error
 */
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'Something went wrong';
};
