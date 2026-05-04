import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import StudentAuth from './pages/StudentAuth';
import CanteenAuth from './pages/CanteenAuth';
import CanteenSelect from './pages/CanteenSelect';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import MyOrders from './pages/MyOrders';
import StaffOrders from './pages/StaffOrders';
import StaffMenu from './pages/StaffMenu';
import CollegeAdminDashboard from './pages/CollegeAdminDashboard';
import './index.css';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!isAuthenticated) return <Navigate to="/" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/student/auth" element={<StudentAuth />} />
          <Route path="/canteen/auth" element={<CanteenAuth />} />
          {/* Legacy routes redirect */}
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="/register" element={<Navigate to="/" />} />
          <Route path="/menu" element={<Navigate to="/canteens" />} />
          {/* Student routes */}
          <Route path="/canteens" element={<ProtectedRoute roles={['student']}><CanteenSelect /></ProtectedRoute>} />
          <Route path="/canteens/:canteenId/menu" element={<ProtectedRoute roles={['student']}><Menu /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute roles={['student']}><Cart /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute roles={['student']}><MyOrders /></ProtectedRoute>} />
          {/* Staff routes */}
          <Route path="/staff/orders" element={<ProtectedRoute roles={['staff']}><StaffOrders /></ProtectedRoute>} />
          <Route path="/staff/menu" element={<ProtectedRoute roles={['staff']}><StaffMenu /></ProtectedRoute>} />
          {/* College admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute roles={['college_admin']}><CollegeAdminDashboard /></ProtectedRoute>} />
        </Routes>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: '14px',
          },
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
