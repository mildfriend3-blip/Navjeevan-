import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Town, Product, StoreInventory, Order, CartItem, OrderStatus, OrderItem } from '../types';
import { INITIAL_PRODUCTS, FRANCHISE_STORES, generateInitialInventories } from '../data/initialData';

interface AppContextType {
  activeRole: 'customer' | 'manager' | 'rider';
  setActiveRole: (role: 'customer' | 'manager' | 'rider') => void;
  currentTown: Town;
  setCurrentTown: (town: Town) => void;
  inventories: { [town in Town]: StoreInventory };
  orders: Order[];
  cart: CartItem[];
  addToCart: (product: Product, localPrice: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (customerName: string, customerAddress: string, customerPhone: string) => Order | null;
  updateOrderStatus: (orderId: string, status: OrderStatus, riderName?: string, riderPhone?: string) => void;
  updateInventoryStock: (town: Town, productId: string, newStock: number) => void;
  updateInventoryPrice: (town: Town, productId: string, newPrice: number) => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_INVENTORIES = 'navjeevan_inventories';
const LOCAL_STORAGE_KEY_ORDERS = 'navjeevan_orders';
const LOCAL_STORAGE_KEY_TOWN = 'navjeevan_current_town';
const LOCAL_STORAGE_KEY_ROLE = 'navjeevan_active_role';

// Initial pre-populated orders to make the app interactive and interesting immediately
const getMockOrders = (): Order[] => {
  return [
    {
      id: 'NP-ORD-72901',
      storeId: 'Jalgaon',
      items: [
        { productId: 'fv-mango', name: 'Fresh Alphonso Mango (Hapus)', price: 349, quantity: 1, unit: '6 Units (Half Dozen)' },
        { productId: 'db-milk', name: 'Amul Taaza Fresh Toned Milk', price: 28, quantity: 3, unit: '500ml Pack' }
      ],
      subtotal: 433,
      deliveryFee: 15,
      total: 448,
      status: 'placed',
      customerName: 'Rahul Patil',
      customerAddress: 'Bunglow No. 5, Shahu Nagar, Jalgaon',
      customerPhone: '+91 98230 45678',
      createdAt: new Date(Date.now() - 4 * 60000).toISOString(), // 4 mins ago
      updatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
      estimatedDeliveryTime: 8,
    },
    {
      id: 'NP-ORD-51034',
      storeId: 'Shahada',
      items: [
        { productId: 'db-bread', name: 'Wibs Premium Brown Bread', price: 45, quantity: 1, unit: '400g Pack' },
        { productId: 'db-butter', name: 'Amul Salted Butter', price: 58, quantity: 1, unit: '100g Pack' },
        { productId: 'sb-maggi', name: 'Maggi 2-Minute Masala Noodles', price: 14, quantity: 5, unit: '70g Single Pack' }
      ],
      subtotal: 173,
      deliveryFee: 15,
      total: 188,
      status: 'preparing',
      customerName: 'Aniket Shinde',
      customerAddress: 'Row House 3, Purushottam Nagar, Shahada',
      customerPhone: '+91 91580 98765',
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(), // 10 mins ago
      updatedAt: new Date(Date.now() - 6 * 60000).toISOString(),
      estimatedDeliveryTime: 5,
    }
  ];
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Role State
  const [activeRole, setActiveRole] = useState<'customer' | 'manager' | 'rider'>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ROLE);
    return (saved as any) || 'manager';
  });

  // 2. Location State
  const [currentTown, setCurrentTown] = useState<Town>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TOWN);
    return (saved as any) || 'Shahada';
  });

  // 3. Inventories State
  const [inventories, setInventories] = useState<{ [town in Town]: StoreInventory }>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_INVENTORIES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing inventories, generating defaults", e);
      }
    }
    return generateInitialInventories();
  });

  // 4. Orders State
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ORDERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing orders, generating defaults", e);
      }
    }
    return getMockOrders();
  });

  // 5. Cart State (Customer local state)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Sync basic configurations to LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ROLE, activeRole);
  }, [activeRole]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_TOWN, currentTown);
  }, [currentTown]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_INVENTORIES, JSON.stringify(inventories));
  }, [inventories]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(orders));
  }, [orders]);

  // Cart operations
  const addToCart = (product: Product, localPrice: number) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const nextCart = [...prev];
        nextCart[existingIndex].quantity += 1;
        return nextCart;
      }
      return [...prev, { product, quantity: 1, localPrice }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Placing an order checks local stock, creates order, and decrements stock in inventory
  const placeOrder = (
    customerName: string,
    customerAddress: string,
    customerPhone: string
  ): Order | null => {
    if (cart.length === 0) return null;

    const subtotal = cart.reduce((acc, item) => acc + item.localPrice * item.quantity, 0);
    const deliveryFee = subtotal > 200 ? 0 : 15; // Free delivery over Rs.200
    const total = subtotal + deliveryFee;

    const orderItems: OrderItem[] = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.localPrice,
      quantity: item.quantity,
      unit: item.product.unit,
    }));

    // Generate unique random Indian-format order ID
    const orderId = `NP-ORD-${Math.floor(10000 + Math.random() * 90000)}`;

    const newOrder: Order = {
      id: orderId,
      storeId: currentTown,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      status: 'placed',
      customerName,
      customerAddress,
      customerPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDeliveryTime: 12, // default quick-commerce time
    };

    // Update inventory stock levels for this town
    setInventories((prev) => {
      const townInventory = { ...prev[currentTown] };
      cart.forEach((item) => {
        if (townInventory[item.product.id]) {
          const currentStock = townInventory[item.product.id].stock;
          const nextStock = Math.max(0, currentStock - item.quantity);
          townInventory[item.product.id] = {
            ...townInventory[item.product.id],
            stock: nextStock,
            isAvailable: nextStock > 0,
          };
        }
      });

      return {
        ...prev,
        [currentTown]: townInventory,
      };
    });

    // Add to orders list
    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  // Update order status (for Franchise Manager and Rider)
  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    riderName?: string,
    riderPhone?: string
  ) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updated: Partial<Order> = {
            status,
            updatedAt: new Date().toISOString(),
          };
          if (riderName) updated.riderName = riderName;
          if (riderPhone) updated.riderPhone = riderPhone;

          // Adjust simulated delivery countdown based on state changes
          if (status === 'out-for-delivery') {
            updated.estimatedDeliveryTime = 6;
          } else if (status === 'delivered') {
            updated.estimatedDeliveryTime = 0;
          }

          return { ...order, ...updated } as Order;
        }
        return order;
      })
    );
  };

  // Update stock level from Manager Dashboard
  const updateInventoryStock = (town: Town, productId: string, newStock: number) => {
    setInventories((prev) => {
      const townInventory = { ...prev[town] };
      if (townInventory[productId]) {
        townInventory[productId] = {
          ...townInventory[productId],
          stock: newStock,
          isAvailable: newStock > 0,
        };
      }
      return {
        ...prev,
        [town]: townInventory,
      };
    });
  };

  // Update product price from Manager Dashboard
  const updateInventoryPrice = (town: Town, productId: string, newPrice: number) => {
    setInventories((prev) => {
      const townInventory = { ...prev[town] };
      if (townInventory[productId]) {
        townInventory[productId] = {
          ...townInventory[productId],
          price: newPrice,
        };
      }
      return {
        ...prev,
        [town]: townInventory,
      };
    });
  };

  // Reset helper
  const resetAllData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_INVENTORIES);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ORDERS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TOWN);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ROLE);
    setInventories(generateInitialInventories());
    setOrders(getMockOrders());
    setCart([]);
    setCurrentTown('Shahada');
    setActiveRole('manager');
  };

  return (
    <AppContext.Provider
      value={{
        activeRole,
        setActiveRole,
        currentTown,
        setCurrentTown,
        inventories,
        orders,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        placeOrder,
        updateOrderStatus,
        updateInventoryStock,
        updateInventoryPrice,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
