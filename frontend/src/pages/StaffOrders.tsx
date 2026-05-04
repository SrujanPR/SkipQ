import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Order, OrderStats } from '../types';
import toast from 'react-hot-toast';
import { Clock, ChefHat, CheckCircle, Package, XCircle, RefreshCw, IndianRupee, TrendingUp } from 'lucide-react';

const statusConfig = {
  pending: { icon: Clock, color: '#F59E0B', bg: '#FEF3C7', label: 'Pending', next: 'preparing' },
  preparing: { icon: ChefHat, color: '#3B82F6', bg: '#DBEAFE', label: 'Preparing', next: 'ready' },
  ready: { icon: CheckCircle, color: '#22C55E', bg: '#DCFCE7', label: 'Ready', next: 'picked_up' },
  picked_up: { icon: Package, color: '#6B7280', bg: '#F3F4F6', label: 'Picked Up', next: null },
  cancelled: { icon: XCircle, color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled', next: null },
};

const nextLabel: Record<string, string> = {
  pending: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Picked Up',
};

export default function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([
        api.getAllOrders(filter || undefined),
        api.getOrderStats(),
      ]);
      setOrders(ordersData);
      setStats(statsData);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status);
      toast.success(`Order #${orderId} → ${status}`);
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="staff-page">
      <div className="staff-header">
        <h1>Order Dashboard</h1>
        <button className="btn btn-outline btn-sm" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <Package size={24} />
            <div>
              <span className="stat-card-value">{stats.today_orders}</span>
              <span className="stat-card-label">Today's Orders</span>
            </div>
          </div>
          <div className="stat-card stat-card-warning">
            <Clock size={24} />
            <div>
              <span className="stat-card-value">{stats.pending}</span>
              <span className="stat-card-label">Pending</span>
            </div>
          </div>
          <div className="stat-card stat-card-info">
            <ChefHat size={24} />
            <div>
              <span className="stat-card-value">{stats.preparing}</span>
              <span className="stat-card-label">Preparing</span>
            </div>
          </div>
          <div className="stat-card stat-card-success">
            <IndianRupee size={24} />
            <div>
              <span className="stat-card-value">&#8377;{stats.today_revenue}</span>
              <span className="stat-card-label">Revenue</span>
            </div>
          </div>
        </div>
      )}

      <div className="staff-filters">
        <button className={`chip ${filter === '' ? 'chip-active' : ''}`} onClick={() => setFilter('')}>
          All
        </button>
        {Object.entries(statusConfig).map(([key, val]) => (
          <button key={key} className={`chip ${filter === key ? 'chip-active' : ''}`} onClick={() => setFilter(key)}>
            {val.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <TrendingUp size={48} strokeWidth={1} />
          <p>No orders {filter ? `with status "${filter}"` : 'yet'}</p>
        </div>
      ) : (
        <div className="staff-orders-grid">
          {orders.map(order => {
            const config = statusConfig[order.status];
            const Icon = config.icon;
            return (
              <div key={order.id} className={`staff-order-card status-${order.status}`}>
                <div className="staff-order-header">
                  <div>
                    <span className="order-id">#{order.id}</span>
                    <span className="staff-order-name">{order.user_name}</span>
                  </div>
                  <div className="status-badge" style={{ color: config.color, background: config.bg }}>
                    <Icon size={14} />
                    {config.label}
                  </div>
                </div>

                <div className="staff-order-items">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="staff-order-item">
                      <span>{item.quantity}x</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="staff-order-notes">
                    <small>Note: {order.notes}</small>
                  </div>
                )}

                <div className="staff-order-footer">
                  <div className="staff-order-meta">
                    <span><Clock size={13} /> {order.slot_time}</span>
                    <span>&#8377;{order.total_amount}</span>
                  </div>
                  <div className="staff-order-actions">
                    {config.next && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => updateStatus(order.id, config.next!)}
                      >
                        {nextLabel[order.status]}
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => updateStatus(order.id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
