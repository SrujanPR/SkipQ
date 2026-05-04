import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { Canteen, CanteenStaff } from '../types';
import toast from 'react-hot-toast';
import { Plus, Store, Users, Trash2, X, Upload, Image, UtensilsCrossed, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

export default function CollegeAdminDashboard() {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCanteenForm, setShowCanteenForm] = useState(false);
  const [canteenForm, setCanteenForm] = useState({ name: '', description: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showStaffForm, setShowStaffForm] = useState<number | null>(null);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '' });
  const [staffMap, setStaffMap] = useState<Record<number, CanteenStaff[]>>({});
  const [expandedCanteen, setExpandedCanteen] = useState<number | null>(null);

  const loadCanteens = () => {
    api.getAdminCanteens()
      .then(setCanteens)
      .catch(() => toast.error('Failed to load canteens'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCanteens(); }, []);

  const loadStaff = async (canteenId: number) => {
    try {
      const staff = await api.getCanteenStaff(canteenId);
      setStaffMap(prev => ({ ...prev, [canteenId]: staff }));
    } catch {
      toast.error('Failed to load staff');
    }
  };

  const toggleExpand = (canteenId: number) => {
    if (expandedCanteen === canteenId) {
      setExpandedCanteen(null);
    } else {
      setExpandedCanteen(canteenId);
      if (!staffMap[canteenId]) {
        loadStaff(canteenId);
      }
    }
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

  const resetCanteenForm = () => {
    setCanteenForm({ name: '', description: '' });
    setImageFile(null);
    setImagePreview(null);
    setShowCanteenForm(false);
  };

  const handleCreateCanteen = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', canteenForm.name);
      formData.append('description', canteenForm.description);
      if (imageFile) formData.append('image', imageFile);

      await api.createCanteen(formData);
      toast.success('Canteen created!');
      resetCanteenForm();
      loadCanteens();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create canteen');
    }
  };

  const handleDeleteCanteen = async (id: number) => {
    if (!confirm('Delete this canteen? This will remove all its menu items, staff accounts, and order history.')) return;
    try {
      await api.deleteCanteen(id);
      toast.success('Canteen deleted');
      loadCanteens();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent, canteenId: number) => {
    e.preventDefault();
    try {
      await api.createCanteenStaff(canteenId, staffForm);
      toast.success('Staff account created!');
      setStaffForm({ name: '', email: '', password: '' });
      setShowStaffForm(null);
      loadStaff(canteenId);
      loadCanteens();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create staff');
    }
  };

  const handleRemoveStaff = async (canteenId: number, userId: number) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await api.removeCanteenStaff(canteenId, userId);
      toast.success('Staff removed');
      loadStaff(canteenId);
      loadCanteens();
    } catch {
      toast.error('Failed to remove staff');
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="staff-page">
      <div className="staff-header">
        <h1>College Dashboard</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCanteenForm(true)}>
          <Plus size={16} /> Add Canteen
        </button>
      </div>

      {/* Create Canteen Modal */}
      {showCanteenForm && (
        <div className="modal-overlay" onClick={resetCanteenForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Canteen</h2>
              <button className="btn-ghost" onClick={resetCanteenForm}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCanteen} className="modal-form">
              <div className="form-group">
                <label>Canteen Name</label>
                <input
                  type="text"
                  value={canteenForm.name}
                  onChange={e => setCanteenForm({ ...canteenForm, name: e.target.value })}
                  placeholder="e.g. Main Canteen, Food Court"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={canteenForm.description}
                  onChange={e => setCanteenForm({ ...canteenForm, description: e.target.value })}
                  placeholder="Brief description of the canteen"
                />
              </div>
              <div className="form-group">
                <label>Cover Image</label>
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
              <button type="submit" className="btn btn-primary btn-full">Create Canteen</button>
            </form>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showStaffForm !== null && (
        <div className="modal-overlay" onClick={() => { setShowStaffForm(null); setStaffForm({ name: '', email: '', password: '' }); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Staff Account</h2>
              <button className="btn-ghost" onClick={() => { setShowStaffForm(null); setStaffForm({ name: '', email: '', password: '' }); }}><X size={20} /></button>
            </div>
            <form onSubmit={e => handleCreateStaff(e, showStaffForm)} className="modal-form">
              <p className="form-hint">Create login credentials for canteen staff. Share these with them so they can log in and manage their menu.</p>
              <div className="form-group">
                <label>Staff Name</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="text"
                  value={staffForm.password}
                  onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="Password (min. 6 characters)"
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Create Staff Account</button>
            </form>
          </div>
        </div>
      )}

      {canteens.length === 0 ? (
        <div className="empty-state">
          <Store size={48} strokeWidth={1} />
          <p>No canteens yet. Create your first canteen to get started!</p>
        </div>
      ) : (
        <div className="admin-canteen-list">
          {canteens.map(canteen => (
            <div key={canteen.id} className="admin-canteen-card">
              <div className="admin-canteen-header" onClick={() => toggleExpand(canteen.id)}>
                <div className="admin-canteen-info">
                  <div className="admin-canteen-icon">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3>{canteen.name}</h3>
                    {canteen.description && <p className="text-muted">{canteen.description}</p>}
                  </div>
                </div>
                <div className="admin-canteen-stats">
                  <span className="admin-stat"><UtensilsCrossed size={14} /> {canteen.menu_count || 0} items</span>
                  <span className="admin-stat"><Users size={14} /> {canteen.staff_count || 0} staff</span>
                  {expandedCanteen === canteen.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {expandedCanteen === canteen.id && (
                <div className="admin-canteen-body">
                  <div className="admin-canteen-section">
                    <div className="admin-section-header">
                      <h4><Users size={16} /> Staff Members</h4>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowStaffForm(canteen.id)}>
                        <UserPlus size={14} /> Add Staff
                      </button>
                    </div>

                    {staffMap[canteen.id] && staffMap[canteen.id].length > 0 ? (
                      <div className="admin-staff-list">
                        {staffMap[canteen.id].map(member => (
                          <div key={member.id} className="admin-staff-item">
                            <div>
                              <strong>{member.name}</strong>
                              <span className="text-muted">{member.email}</span>
                            </div>
                            <button
                              className="btn-icon text-danger"
                              onClick={() => handleRemoveStaff(canteen.id, member.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted admin-empty-text">No staff assigned yet. Add staff to let them manage this canteen's menu and orders.</p>
                    )}
                  </div>

                  <div className="admin-canteen-actions">
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCanteen(canteen.id)}>
                      <Trash2 size={14} /> Delete Canteen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
