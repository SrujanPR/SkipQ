import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Order } from '../types';
import toast from 'react-hot-toast';
import { Package, Clock, ChefHat, CheckCircle, XCircle, ArrowRight, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
  pending: { icon: Clock, color: '#F59E0B', bg: '#FEF3C7', label: 'Pending' },
  preparing: { icon: ChefHat, color: '#3B82F6', bg: '#DBEAFE', label: 'Preparing' },
  ready: { icon: CheckCircle, color: '#22C55E', bg: '#DCFCE7', label: 'Ready!' },
  picked_up: { icon: Package, color: '#6B7280', bg: '#F3F4F6', label: 'Picked Up' },
  cancelled: { icon: XCircle, color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled' },
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMyOrders().then(setOrders).catch(() => toast.error('Failed to load orders')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  if (orders.length === 0) {
    return (
      <div className="empty-page">
        <Package size={64} strokeWidth={1} />
        <h2>No orders yet</h2>
        <p>Your order history will show up here</p>
        <button className="btn btn-primary" onClick={() => navigate('/canteens')}>
          Browse Canteens <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1>My Orders</h1>

      <div className="orders-list">
        {orders.map(order => {
          const config = statusConfig[order.status];
          const Icon = config.icon;
          return (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div>
                  <span className="order-id">Order #{order.id}</span>
                  <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div className="status-badge" style={{ color: config.color, background: config.bg }}>
                  <Icon size={14} />
                  {config.label}
                </div>
              </div>
              {order.canteen_name && (
                <div className="order-canteen">
                  <Store size={14} /> {order.canteen_name}
                </div>
              )}
              <div className="order-card-body">
                <div className="order-items-list">
                  {order.items.map((item, idx) => (
                    <span key={idx} className="order-item-tag">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                </div>
                <div className="order-card-meta">
                  <span><Clock size={14} /> Pickup: {order.slot_time}</span>
                  <span className="order-total">&#8377;{order.total_amount}</span>
                </div>
              </div>
              {order.status === 'ready' && (
                <div className="order-ready-banner">
                  Your food is ready! Head to the counter now.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
