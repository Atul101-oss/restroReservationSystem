import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineLogout, HiOutlineCalendar, HiOutlineViewGrid } from 'react-icons/hi';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <HiOutlineCalendar className="brand-icon" />
          <span>ReserveTable</span>
        </Link>

        <div className="navbar-links">
          {isAdmin ? (
            <>
              <Link to="/admin/reservations" className="nav-link">
                <HiOutlineCalendar /> Reservations
              </Link>
              <Link to="/admin/tables" className="nav-link">
                <HiOutlineViewGrid /> Tables
              </Link>
            </>
          ) : (
            <>
              <Link to="/reservations/new" className="nav-link">
                <HiOutlineCalendar /> Book Table
              </Link>
              <Link to="/reservations" className="nav-link">
                <HiOutlineViewGrid /> My Bookings
              </Link>
            </>
          )}
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className={`user-role role-${user.role}`}>
              {user.role}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Logout">
            <HiOutlineLogout />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
