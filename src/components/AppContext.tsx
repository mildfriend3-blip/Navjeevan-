import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Town, Product, StoreInventory, Order, CartItem, OrderStatus, OrderItem, LoggedInUser } from '../types';
import { INITIAL_PRODUCTS, FRANCHISE_STORES, generateInitialInventories } from '../data/initialData';

interface AppContextType {
  activeRole: 'customer' | 'manager' | 'rider';
  setActiveRole: (role: 'customer' | 'manager' | 'rider') => void;
  currentUser: LoggedInUser | null;
  loginUser: (phone: string, role: 'customer' | 'manager' | 'rider', name: string) => void;
  logoutUser: () => void;
  currentTown: Town;
  setCurrentTown: (town: Town) => void;
  selectedNeighborhood: string;
  setSelectedNeighborhood: (neighborhood: string) => void;
  flatDetails: string;
  setFlatDetails: (details: string) => void;
  deliveryTip: number;
  setDeliveryTip: (tip: number) => void;
  deliveryInstruction: string;
  setDeliveryInstruction: (instruction: string) => void;
  inventories: { [town in Town]: StoreInventory };
  orders: Order[];
  cart: CartItem[];
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  addToCart: (product: Product, localPrice: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (customerName: string, customerAddress: string, customerPhone: string, storeId?: string, customerLat?: number, customerLng?: number) => Order | null;
  updateOrderStatus: (orderId: string, status: OrderStatus, riderName?: string, riderPhone?: string) => void;
  updateInventoryStock: (town: Town, productId: string, newStock: number) => void;
  updateInventoryPrice: (town: Town, productId: string, newPrice: number) => void;
  resetAllData: () => void;
  userLatLng: { lat: number; lng: number } | null;
  setUserLatLng: (latLng: { lat: number; lng: number } | null) => void;
  activeOrders: Order[];
  isTrackingDrawerOpen: boolean;
  setIsTrackingDrawerOpen: (open: boolean) => void;
  trackingOrderId: string | null;
  setTrackingOrderId: (id: string | null) => void;
  updateUserProfile: (name: string, email: string) => void;
  updateWalletBalance: (newBalance: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_INVENTORIES = 'navjeevan_inventories';
const LOCAL_STORAGE_KEY_ORDERS = 'navjeevan_orders';
const LOCAL_STORAGE_KEY_TOWN = 'navjeevan_current_town';
const LOCAL_STORAGE_KEY_ROLE = 'navjeevan_active_role';
const LOCAL_STORAGE_KEY_PRODUCTS = 'navjeevan_products';

// Initial pre-populated orders to make the app interactive and interesting immediately
const getMockOrders = (): Order[] => {
  return [];
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 0. User Auth State
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(() => {
    const saved = localStorage.getItem('navjeevan_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing current user", e);
      }
    }
    return null;
  });

  // 1. Role State
  const [activeRole, setActiveRole] = useState<'customer' | 'manager' | 'rider'>(() => {
    const savedUser = localStorage.getItem('navjeevan_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser) as LoggedInUser;
        return u.role;
      } catch (e) {}
    }
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ROLE);
    return (saved as any) || 'customer';
  });

  const loginUser = (phone: string, role: 'customer' | 'manager' | 'rider', name: string) => {
    // 1. Check if user profile already exists in localStorage database
    const key = `user_data_${phone}`;
    const saved = localStorage.getItem(key);
    let profile: any = null;
    if (saved) {
      try {
        profile = JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing user profile data", e);
      }
    }

    if (!profile) {
      // Create new user profile with default wallet balance of ₹250
      profile = {
        phone,
        name: name || `User (${phone.slice(-4)})`,
        email: '',
        role,
        walletBalance: 250,
        savedAddresses: {
          neighborhood: selectedNeighborhood || 'Shahada Central',
          flatDetails: flatDetails || 'Apartment 204, Block-B, near landmark'
        },
        orders: []
      };
      localStorage.setItem(key, JSON.stringify(profile));
    } else {
      // If it exists, make sure wallet balance is defined
      if (profile.walletBalance === undefined) {
        profile.walletBalance = 250;
      }
      // If custom name is entered on login, we can use it to update their stored name
      if (name && name !== `User (${phone.slice(-4)})` && name !== profile.name) {
        profile.name = name;
      }
    }

    // 2. Instantly restore saved addresses if they exist
    if (profile.savedAddresses) {
      if (profile.savedAddresses.neighborhood) {
        setSelectedNeighborhood(profile.savedAddresses.neighborhood);
        localStorage.setItem('navjeevan_selected_neighborhood', profile.savedAddresses.neighborhood);
      }
      if (profile.savedAddresses.flatDetails) {
        setFlatDetails(profile.savedAddresses.flatDetails);
        localStorage.setItem('navjeevan_flat_details', profile.savedAddresses.flatDetails);
      }
    }

    // 3. Instantly restore exact past order history
    if (profile.orders && profile.orders.length > 0) {
      setOrders((prev) => {
        const otherOrders = prev.filter((o) => o.customerPhone !== phone);
        return [...profile.orders, ...otherOrders];
      });
    }

    // 4. Create logged in user session state
    const u: LoggedInUser = {
      phone,
      role,
      name: profile.name,
      email: profile.email || '',
      walletBalance: profile.walletBalance
    };

    setCurrentUser(u);
    setActiveRole(role);
    localStorage.setItem('navjeevan_current_user', JSON.stringify(u));
    localStorage.setItem(LOCAL_STORAGE_KEY_ROLE, role);
  };

  const logoutUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('navjeevan_current_user');
  };

  const updateUserProfile = (name: string, email: string) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, name, email };
      localStorage.setItem('navjeevan_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  const updateWalletBalance = (newBalance: number) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, walletBalance: newBalance };
      localStorage.setItem('navjeevan_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  // 2. Location State
  const [currentTown, setCurrentTown] = useState<Town>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TOWN);
    return (saved as any) || 'Shahada';
  });

  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(() => {
    return localStorage.getItem('navjeevan_selected_neighborhood') || '';
  });

  const [flatDetails, setFlatDetails] = useState<string>(() => {
    return localStorage.getItem('navjeevan_flat_details') || 'Apartment 204, Block-B, near landmark';
  });

  const [userLatLng, setUserLatLng] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = localStorage.getItem('navjeevan_user_lat_lng');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (userLatLng) {
      localStorage.setItem('navjeevan_user_lat_lng', JSON.stringify(userLatLng));
    } else {
      localStorage.removeItem('navjeevan_user_lat_lng');
    }
  }, [userLatLng]);

  const [deliveryTip, setDeliveryTip] = useState<number>(0);
  const [deliveryInstruction, setDeliveryInstruction] = useState<string>('Avoid ringing bell');

  // Tracking states
  const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy mock orders if any lingered in localStorage
          const cleaned = parsed.filter(o => !['58893', '50893', '72901', '51034'].some(id => o.id?.includes(id)));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(cleaned));
          }
          return cleaned;
        }
      } catch (e) {
        console.error("Error parsing orders, resetting to empty array", e);
      }
    }
    return getMockOrders();
  });

  const activeOrders = useMemo(() => {
    return orders.filter(o => {
      const s = (o.status || '').toUpperCase();
      if (s === 'DELIVERED' || s === 'CANCELLED') return false;
      return (
        s === 'PLACED' ||
        s === 'PACKED' ||
        s === 'PREPARING' ||
        s === 'ACCEPTED' ||
        s === 'DISPATCHED' ||
        s === 'OUT_FOR_DELIVERY' ||
        s === 'OUT-FOR-DELIVERY'
      );
    });
  }, [orders]);

  // 4.5. Products State
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PRODUCTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing products, generating defaults", e);
      }
    }
    return INITIAL_PRODUCTS;
  });

  // 5. Cart State (Customer local state)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Sync basic configurations to LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ROLE, activeRole);
  }, [activeRole]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_TOWN, currentTown);
  }, [currentTown]);

  useEffect(() => {
    localStorage.setItem('navjeevan_selected_neighborhood', selectedNeighborhood);
  }, [selectedNeighborhood]);

  useEffect(() => {
    localStorage.setItem('navjeevan_flat_details', flatDetails);
  }, [flatDetails]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_INVENTORIES, JSON.stringify(inventories));
  }, [inventories]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(orders));
  }, [orders]);

  // Listen for storage events to synchronize orders between tabs/iframes instantly
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY_ORDERS && event.newValue) {
        try {
          const updatedOrders = JSON.parse(event.newValue);
          setOrders(updatedOrders);
        } catch (e) {
          console.error("Error syncing orders from storage event", e);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Real-time synchronization of current customer's exact profile database (keyed by phone number)
  useEffect(() => {
    if (currentUser && currentUser.phone && currentUser.role === 'customer') {
      const key = `user_data_${currentUser.phone}`;
      const customerOrdersList = orders.filter((o) => o.customerPhone === currentUser.phone);
      const profile = {
        phone: currentUser.phone,
        name: currentUser.name,
        email: currentUser.email || '',
        role: currentUser.role,
        walletBalance: currentUser.walletBalance !== undefined ? currentUser.walletBalance : 250,
        savedAddresses: {
          neighborhood: selectedNeighborhood,
          flatDetails: flatDetails,
        },
        orders: customerOrdersList,
      };
      localStorage.setItem(key, JSON.stringify(profile));
    }
  }, [currentUser, selectedNeighborhood, flatDetails, orders]);

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
    customerPhone: string,
    storeId?: string,
    customerLat?: number,
    customerLng?: number
  ): Order | null => {
    if (cart.length === 0) return null;

    const subtotal = cart.reduce((acc, item) => acc + item.localPrice * item.quantity, 0);
    const deliveryFee = subtotal > 200 ? 0 : 15; // Free delivery over Rs.200
    const handlingFeeVal = 10;
    const total = subtotal + deliveryFee + handlingFeeVal + deliveryTip;

    const orderItems: OrderItem[] = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.localPrice,
      quantity: item.quantity,
      unit: item.product.unit,
    }));

    // Generate unique random Indian-format order ID
    const orderId = `NP-ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalStoreId = storeId ? storeId.toLowerCase() : currentTown.toLowerCase();

    const newOrder: Order = {
      id: orderId,
      storeId: finalStoreId,
      items: orderItems,
      subtotal,
      deliveryFee,
      handlingFee: handlingFeeVal,
      deliveryTip,
      deliveryInstruction: deliveryInstruction || undefined,
      total,
      status: 'PLACED',
      customerName,
      customerAddress,
      customerPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDeliveryTime: 12, // default quick-commerce time
      customerLat,
      customerLng,
    };

    // Find the correct capitalized town to update the inventory
    const normalizedTown = (Object.keys(inventories) as Town[]).find(
      (t) => t.toLowerCase() === finalStoreId
    ) || currentTown;

    // Update inventory stock levels for this town
    setInventories((prev) => {
      const townInventory = { ...prev[normalizedTown] };
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
        [normalizedTown]: townInventory,
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
    setOrders((prev) => {
      const targetCleanId = (orderId || '').replace(/^NP-ORD-?/i, '');
      const nextOrders = prev.map((order) => {
        const currentCleanId = (order.id || '').replace(/^NP-ORD-?/i, '');
        if (order.id === orderId || currentCleanId === targetCleanId) {
          const updated: Partial<Order> = {
            status,
            updatedAt: new Date().toISOString(),
          };
          if (riderName) updated.riderName = riderName;
          if (riderPhone) updated.riderPhone = riderPhone;

          // Adjust simulated delivery countdown based on state changes
          if (status === 'out-for-delivery' || status === 'DISPATCHED' || status === 'dispatched') {
            updated.estimatedDeliveryTime = 6;
          } else if (status === 'delivered' || status === 'DELIVERED') {
            updated.estimatedDeliveryTime = 0;
            updated.completedAt = new Date().toISOString();
          }

          return { ...order, ...updated } as Order;
        }
        return order;
      });

      // Synchronize directly to local storage to make sure any other open tabs get the update immediately
      localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(nextOrders));

      // Trigger a StorageEvent for standard browser tabs
      try {
        const storageEvent = new StorageEvent('storage', {
          key: LOCAL_STORAGE_KEY_ORDERS,
          newValue: JSON.stringify(nextOrders),
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      } catch (e) {
        console.warn("Storage event dispatch error", e);
      }

      // Also trigger a custom event
      window.dispatchEvent(new CustomEvent('navjeevan_order_update', {
        detail: { orderId, status }
      }));

      return nextOrders;
    });
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

  // Add new product from Manager Dashboard
  const addProduct = (newProdData: Omit<Product, 'id'>) => {
    const id = `${newProdData.category}-${Date.now()}`;
    const newProduct: Product = { ...newProdData, id };

    // 1. Add to products list
    setProducts((prev) => [...prev, newProduct]);

    // 2. Initialize inventory for this product in ALL towns
    setInventories((prev) => {
      const updated = { ...prev };
      (Object.keys(updated) as Town[]).forEach((town) => {
        updated[town] = {
          ...updated[town],
          [id]: {
            price: newProduct.price,
            stock: 24, // Default initial stock count as requested
            isAvailable: true
          }
        };
      });
      return updated;
    });
  };

  // Reset helper
  const resetAllData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_INVENTORIES);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ORDERS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TOWN);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ROLE);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PRODUCTS);
    setProducts(INITIAL_PRODUCTS);
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
        currentUser,
        loginUser,
        logoutUser,
        currentTown,
        setCurrentTown,
        selectedNeighborhood,
        setSelectedNeighborhood,
        flatDetails,
        setFlatDetails,
        deliveryTip,
        setDeliveryTip,
        deliveryInstruction,
        setDeliveryInstruction,
        inventories,
        orders,
        cart,
        products,
        addProduct,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        placeOrder,
        updateOrderStatus,
        updateInventoryStock,
        updateInventoryPrice,
        resetAllData,
        userLatLng,
        setUserLatLng,
        activeOrders,
        isTrackingDrawerOpen,
        setIsTrackingDrawerOpen,
        trackingOrderId,
        setTrackingOrderId,
        updateUserProfile,
        updateWalletBalance,
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
