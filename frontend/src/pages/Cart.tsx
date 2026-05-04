import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import type { TimeSlot } from '../types';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Clock, ShoppingBag, ArrowRight, StickyNote, Store } from 'lucide-react';

export default function Cart() {
  const { items, canteenId, canteenName, updateQuantity, removeItem, clearCart, total } = useCart();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (canteenId) {
      api.getTimeSlots(canteenId).then(setSlots).catch(() => toast.error('Failed to load time slots'));
    }
  }, [canteenId]);

  const handleOrder = async () => {
    if (!selectedSlot || !canteenId) {
      toast.error('Please select a pickup time slot');
      return;
    }
    setLoading(true);
    try {
      const orderItems = items.map(i => ({
        menu_item_id: i.menuItem.id,
        quantity: i.quantity,
      }));
      await api.placeOrder(orderItems, selectedSlot, notes, canteenId);
      clearCart();
      toast.success('Order placed! You\'ll be notified when it\'s ready.', { duration: 4000, icon: '🎉' });
      navigate('/orders');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="empty-page">
        <ShoppingBag size={64} strokeWidth={1} />
        <h2>Your cart is empty</h2>
        <p>Add some delicious items from the menu!</p>
        <button className="btn btn-primary" onClick={() => navigate('/canteens')}>
          Browse Canteens <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Your Cart</h1>
      {canteenName && (
        <div className="cart-canteen-badge">
          <Store size={16} /> Ordering from <strong>{canteenName}</strong>
        </div>
      )}

      <div className="cart-layout">
        <div className="cart-items">
          {items.map(({ menuItem, quantity }) => (
            <div key={menuItem.id} className="cart-item">
              <img
                src={menuItem.image_url ? api.imageUrl(menuItem.image_url) : `https://placehold.co/80x80/FF6B35/white?text=${encodeURIComponent(menuItem.name)}`}
                alt={menuItem.name}
                className="cart-item-img"
                onError={e => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/80x80/FF6B35/white?text=${encodeURIComponent(menuItem.name)}`;
                }}
              />
              <div className="cart-item-info">
                <h3>{menuItem.name}</h3>
                <p className="text-muted">{menuItem.category}</p>
                <span className="cart-item-price">&#8377;{menuItem.price * quantity}</span>
              </div>
              <div className="cart-item-actions">
                <div className="qty-control">
                  <button onClick={() => updateQuantity(menuItem.id, quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <span>{quantity}</span>
                  <button onClick={() => updateQuantity(menuItem.id, quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <button className="btn-ghost text-danger" onClick={() => removeItem(menuItem.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-sidebar">
          <div className="cart-section">
            <h3><Clock size={18} /> Pick a Time Slot</h3>
            <div className="slot-grid">
              {slots.map(slot => (
                <button
                  key={slot.id}
                  className={`slot-btn ${selectedSlot === slot.id ? 'slot-active' : ''} ${slot.current_orders >= slot.max_orders ? 'slot-full' : ''}`}
                  onClick={() => setSelectedSlot(slot.id)}
                  disabled={slot.current_orders >= slot.max_orders}
                >
                  {slot.slot_time}
                  <small>{slot.max_orders - slot.current_orders} left</small>
                </button>
              ))}
            </div>
          </div>

          <div className="cart-section">
            <h3><StickyNote size={18} /> Special Instructions</h3>
            <textarea
              placeholder="Any allergies or special requests?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>&#8377;{total}</span>
            </div>
            <div className="cart-summary-row cart-total">
              <span>Total</span>
              <span>&#8377;{total}</span>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleOrder}
              disabled={loading || !selectedSlot}
            >
              {loading ? 'Placing Order...' : 'Place Order'} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
