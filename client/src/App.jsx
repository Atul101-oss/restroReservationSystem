import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateReservation from './pages/CreateReservation';
import MyReservations from './pages/MyReservations';
import AdminReservations from './pages/AdminReservations';
import AdminTables from './pages/AdminTables';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div>;
  }

  const getHomeRedirect = () => {
    if (!user) return '/login';
    return user.role === 'admin' ? '/admin/reservations' : '/reservations';
  };

  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={user ? <Navigate to={getHomeRedirect()} /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to={getHomeRedirect()} /> : <Register />} />

          {/* Customer routes */}
          <Route path="/reservations" element={<ProtectedRoute roles={['customer']}><MyReservations /></ProtectedRoute>} />
          <Route path="/reservations/new" element={<ProtectedRoute roles={['customer']}><CreateReservation /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/reservations" element={<ProtectedRoute roles={['admin']}><AdminReservations /></ProtectedRoute>} />
          <Route path="/admin/tables" element={<ProtectedRoute roles={['admin']}><AdminTables /></ProtectedRoute>} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to={getHomeRedirect()} replace />} />
        </Routes>
      </main>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#f1f5f9', borderRadius: '10px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }} />
      </AuthProvider>
    </Router>
  );
}

export default App;
