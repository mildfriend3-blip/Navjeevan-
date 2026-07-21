export type Town = 'Jalgaon' | 'Shahada' | 'Nandurbar' | 'Dhule';

export type Category = 
  | 'fruits-veg' 
  | 'dairy-bakery' 
  | 'grocery' 
  | 'snacks-beverages' 
  | 'personal-care' 
  | 'household';

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number; // Base price
  unit: string;  // e.g., "1 kg", "500g", "1 Unit", "1 Litre"
  icon: string;  // Name of the Lucide icon to display
  imageColor: string; // Gradient color for visual representation
  imageUrl?: string; // High-quality Unsplash image URL
  description: string;
}

export interface StoreInventory {
  [productId: string]: {
    price: number;  // Local franchise pricing
    stock: number;  // Local franchise stock level
    isAvailable: boolean;
  };
}

export interface FranchiseStore {
  id: Town;
  name: string;
  address: string;
  contact: string;
  minOrderValue: number;
  deliveryTimeMins: number; // e.g., 10-15 mins
}

export type OrderStatus = 'placed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface Order {
  id: string;
  storeId: Town;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryTime: number; // Countdown in minutes
  riderName?: string;
  riderPhone?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  localPrice: number;
}
