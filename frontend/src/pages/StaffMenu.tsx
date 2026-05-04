import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { MenuItem } from '../types';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Upload, Image } from 'lucide-react';

export default function StaffMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMenu = () => {
    api.getAllMenu().then(setItems).catch(() => toast.error('Failed to load menu')).finally(() => setLoading(false));
  };

  useEffect(() => { loadMenu(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category: '' });
    setImageFile(null);
    setImagePreview(null);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
    });
    setImageFile(null);
    setImagePreview(item.image_url ? api.imageUrl(item.image_url) : null);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('category', form.category);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editing) {
        await api.updateMenuItem(editing.id, formData);
        toast.success('Item updated');
      } else {
        await api.addMenuItem(formData);
        toast.success('Item added');
      }
      resetForm();
      loadMenu();
    } catch {
      toast.error('Failed to save item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.deleteMenuItem(id);
      toast.success('Item deleted');
      loadMenu();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await api.updateMenuItemJson(item.id, { available: item.available ? 0 : 1 });
      toast.success(item.available ? 'Item hidden from menu' : 'Item now available');
      loadMenu();
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="staff-page">
      <div className="staff-header">
        <h1>Manage Menu</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add Items
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Item' : 'Add New Item'}</h2>
              <button className="btn-ghost" onClick={resetForm}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price (&#8377;)</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Food Image</label>
                <div className="image-upload-area" onClick={() => fileInputRef.current?.click()}>
                  {imagePreview ? (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <div className="image-preview-overlay">
                        <Upload size={20} />
                        <span>Change Image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <Image size={32} />
                      <span>Click to upload image</span>
                      <small>JPG, PNG up to 5MB</small>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full">{editing ? 'Update Item' : 'Add Item'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="staff-menu-table">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className={!item.available ? 'row-disabled' : ''}>
                <td>
                  <div className="table-item">
                    <img
                      src={item.image_url ? api.imageUrl(item.image_url) : `https://placehold.co/40x40/FF6B35/white?text=${encodeURIComponent(item.name[0])}`}
                      alt={item.name}
                      onError={e => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/40x40/FF6B35/white?text=${encodeURIComponent(item.name[0])}`;
                      }}
                    />
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </div>
                  </div>
                </td>
                <td><span className="chip chip-small">{item.category}</span></td>
                <td>&#8377;{item.price}</td>
                <td>
                  <button className={`chip chip-small ${item.available ? 'chip-success' : 'chip-danger'}`} onClick={() => toggleAvailability(item)}>
                    {item.available ? <><Eye size={12} /> Available</> : <><EyeOff size={12} /> Hidden</>}
                  </button>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn-icon" onClick={() => handleEdit(item)}><Pencil size={15} /></button>
                    <button className="btn-icon text-danger" onClick={() => handleDelete(item.id)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
