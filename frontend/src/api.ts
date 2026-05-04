const API_BASE = 'http://localhost:3001/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('skipq_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function uploadRequest(path: string, formData: FormData) {
  const token = localStorage.getItem('skipq_token');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function uploadUpdateRequest(path: string, formData: FormData) {
  const token = localStorage.getItem('skipq_token');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, college_id: number) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, college_id }) }),
  registerCollege: (name: string, email: string, password: string, college_name: string) =>
    request('/auth/register-college', { method: 'POST', body: JSON.stringify({ name, email, password, college_name }) }),
  googleAuth: (credential: string, college_id?: number) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify({ credential, college_id }) }),
  getColleges: () => request('/auth/colleges'),

  // Canteens
  getCanteens: () => request('/canteens'),
  getAdminCanteens: () => request('/canteens/admin'),
  createCanteen: (formData: FormData) => uploadRequest('/canteens', formData),
  updateCanteen: (id: number, formData: FormData) => uploadUpdateRequest(`/canteens/${id}`, formData),
  deleteCanteen: (id: number) => request(`/canteens/${id}`, { method: 'DELETE' }),
  getCanteenStaff: (canteenId: number) => request(`/canteens/${canteenId}/staff`),
  createCanteenStaff: (canteenId: number, data: { name: string; email: string; password: string }) =>
    request(`/canteens/${canteenId}/staff`, { method: 'POST', body: JSON.stringify(data) }),
  removeCanteenStaff: (canteenId: number, userId: number) =>
    request(`/canteens/${canteenId}/staff/${userId}`, { method: 'DELETE' }),

  // Menu
  getCanteenMenu: (canteenId: number) => request(`/menu/available/${canteenId}`),
  getAllMenu: () => request('/menu'),
  addMenuItem: (formData: FormData) => uploadRequest('/menu', formData),
  updateMenuItem: (id: number, formData: FormData) => uploadUpdateRequest(`/menu/${id}`, formData),
  updateMenuItemJson: (id: number, item: Record<string, unknown>) =>
    request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  deleteMenuItem: (id: number) =>
    request(`/menu/${id}`, { method: 'DELETE' }),

  // Orders
  placeOrder: (items: { menu_item_id: number; quantity: number }[], time_slot_id: number, notes: string, canteen_id: number) =>
    request('/orders', { method: 'POST', body: JSON.stringify({ items, time_slot_id, notes, canteen_id }) }),
  getMyOrders: () => request('/orders/my'),
  getAllOrders: (status?: string) =>
    request(`/orders/all${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (id: number, status: string) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getOrderStats: () => request('/orders/stats'),

  // Time slots
  getTimeSlots: (canteenId: number) => request(`/timeslots?canteenId=${canteenId}`),

  // Image URL helper
  imageUrl: (path: string) => path?.startsWith('/api/') ? `${API_BASE.replace('/api', '')}${path}` : path,
};
