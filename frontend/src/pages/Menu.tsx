import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import type { MenuItem, Canteen } from '../types';
import toast from 'react-hot-toast';
import { Plus, Search, ShoppingBag, Filter, ArrowLeft } from 'lucide-react';

export default function Menu() {
  const { canteenId } = useParams<{ canteenId: string }>();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const { addItem, itemCount, canteenId: cartCanteenId } = useCart();

  useEffect(() => {
    if (!canteenId) return;
    const id = Number(canteenId);

    Promise.all([
      api.getCanteenMenu(id),
      api.getCanteens().then((canteens: Canteen[]) => canteens.find(c => c.id === id) || null),
    ])
      .then(([menuItems, canteenData]) => {
        setItems(menuItems);
        setCanteen(canteenData);
      })
      .catch(() => toast.error('Failed to load menu'))
      .finally(() => setLoading(false));
  }, [canteenId]);

  const categories = ['All', ...new Set(items.map(i => i.category))];

  const filtered = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || i.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = (item: MenuItem) => {
    if (!canteen) return;
    const isNewCanteen = cartCanteenId !== null && cartCanteenId !== canteen.id;
    if (isNewCanteen) {
      toast(`Cart cleared — switched to ${canteen.name}`, { icon: '🔄', duration: 2000 });
    }
    addItem(item, canteen.id, canteen.name);
    toast.success(`${item.name} added to cart`, { icon: '🛒', duration: 1500 });
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="menu-page">
      <div className="menu-header">
        <div>
          <Link to="/canteens" className="back-link"><ArrowLeft size={18} /> All Canteens</Link>
          <h1>{canteen?.name || 'Menu'}</h1>
          <p className="text-muted">Fresh food, zero wait time</p>
        </div>
        {itemCount > 0 && (
          <Link to="/cart" className="btn btn-primary">
            <ShoppingBag size={18} />
            View Cart ({itemCount})
          </Link>
        )}
      </div>

      <div className="menu-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search for dishes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="category-filters">
          <Filter size={16} />
          {categories.map(cat => (
            <button
              key={cat}
              className={`chip ${category === cat ? 'chip-active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No dishes found. Try a different search!</p>
        </div>
      ) : (
        <div className="menu-grid">
          {filtered.map(item => (
            <div key={item.id} className="menu-card">
              <div className="menu-card-img">
                <img
                  src={item.image_url ? api.imageUrl(item.image_url) : `https://placehold.co/400x300/FF6B35/white?text=${encodeURIComponent(item.name)}`}
                  alt={item.name}
                  onError={e => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/400x300/FF6B35/white?text=${encodeURIComponent(item.name)}`;
                  }}
                />
                <span className="menu-card-category">{item.category}</span>
              </div>
              <div className="menu-card-body">
                <h3>{item.name}</h3>
                <p className="menu-card-desc">{item.description}</p>
                <div className="menu-card-footer">
                  <span className="menu-card-price">&#8377;{item.price}</span>
                  <button className="btn btn-primary btn-sm" onClick={() => handleAdd(item)}>
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
