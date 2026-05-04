export interface College {
  id: number;
  name: string;
}

export interface Canteen {
  id: number;
  college_id: number;
  name: string;
  description?: string;
  image_url?: string;
  menu_count?: number;
  staff_count?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'staff' | 'college_admin';
  college_id: number;
  college_name: string;
  canteen_id?: number;
  canteen_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: number;
}

export interface TimeSlot {
  id: number;
  slot_time: string;
  max_orders: number;
  current_orders: number;
  date: string;
}

export interface OrderItem {
  menu_item_id: number;
  quantity: number;
  price: number;
  name: string;
  category?: string;
  image_url?: string;
}

export interface Order {
  id: number;
  user_id: number;
  canteen_id: number;
  canteen_name?: string;
  time_slot_id: number;
  status: 'pending' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
  total_amount: number;
  notes: string;
  slot_time: string;
  date: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  user_name?: string;
  user_email?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderStats {
  today_orders: number;
  pending: number;
  preparing: number;
  today_revenue: number;
}

export interface CanteenStaff {
  id: number;
  name: string;
  email: string;
  created_at: string;
}
