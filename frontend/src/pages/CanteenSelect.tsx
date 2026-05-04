import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Canteen } from '../types';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { Store, UtensilsCrossed, ShoppingBag } from 'lucide-react';

export default function CanteenSelect() {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { itemCount, canteenId, canteenName } = useCart();

  useEffect(() => {
    api.getCanteens()
      .then(setCanteens)
      .catch(() => toast.error('Failed to load canteens'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  if (canteens.length === 0) {
    return (
      <div className="empty-page">
        <Store size={64} strokeWidth={1} />
        <h2>No canteens available</h2>
        <p>Your college hasn't set up any canteens yet. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="canteen-select-page">
      <div className="canteen-select-header">
        <div>
          <h1>Choose a Canteen</h1>
          <p className="text-muted">Select where you'd like to order from</p>
        </div>
        {itemCount > 0 && (
          <button className="btn btn-primary" onClick={() => navigate('/cart')}>
            <ShoppingBag size={18} />
            Cart ({itemCount}) - {canteenName}
          </button>
        )}
      </div>

      <div className="canteen-grid">
        {canteens.map(canteen => (
          <div
            key={canteen.id}
            className={`canteen-card ${canteenId === canteen.id ? 'canteen-card-active' : ''}`}
            onClick={() => navigate(`/canteens/${canteen.id}/menu`)}
          >
            <div className="canteen-card-img">
              {canteen.image_url ? (
                <img
                  src={api.imageUrl(canteen.image_url)}
                  alt={canteen.name}
                  onError={e => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/400x200/FF6B35/white?text=${encodeURIComponent(canteen.name)}`;
                  }}
                />
              ) : (
                <div className="canteen-card-placeholder">
                  <Store size={48} />
                </div>
              )}
              {canteenId === canteen.id && itemCount > 0 && (
                <span className="canteen-card-cart-badge">
                  <ShoppingBag size={14} /> {itemCount} in cart
                </span>
              )}
            </div>
            <div className="canteen-card-body">
              <h3>{canteen.name}</h3>
              {canteen.description && <p className="canteen-card-desc">{canteen.description}</p>}
              <div className="canteen-card-meta">
                <span><UtensilsCrossed size={14} /> {canteen.menu_count || 0} items</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
