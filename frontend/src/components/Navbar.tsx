import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, LogOut, User, GraduationCap, Store } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="SkipQ" className="logo-img" />
          <span>SkipQ</span>
        </Link>

        <div className="nav-links">
          {!isAuthenticated ? (
            <>
              <Link to="/student/auth" className="nav-link">Student</Link>
              <Link to="/canteen/auth" className="nav-link">Partner</Link>
            </>
          ) : user?.role === 'college_admin' ? (
            <>
              <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
              <div className="nav-college">
                <GraduationCap size={14} />
                <span>{user.college_name}</span>
              </div>
              <div className="nav-user">
                <User size={16} />
                <span>{user.name}</span>
              </div>
              <button onClick={handleLogout} className="nav-link btn-ghost">
                <LogOut size={18} />
              </button>
            </>
          ) : user?.role === 'staff' ? (
            <>
              <Link to="/staff/orders" className="nav-link">Orders</Link>
              <Link to="/staff/menu" className="nav-link">Menu</Link>
              <div className="nav-college">
                <Store size={14} />
                <span>{user.canteen_name}</span>
              </div>
              <div className="nav-user">
                <User size={16} />
                <span>{user.name}</span>
              </div>
              <button onClick={handleLogout} className="nav-link btn-ghost">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/canteens" className="nav-link">Canteens</Link>
              <Link to="/orders" className="nav-link">My Orders</Link>
              <Link to="/cart" className="nav-link cart-link">
                <ShoppingBag size={20} />
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </Link>
              <div className="nav-college">
                <GraduationCap size={14} />
                <span>{user?.college_name}</span>
              </div>
              <div className="nav-user">
                <User size={16} />
                <span>{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="nav-link btn-ghost">
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
