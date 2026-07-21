import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { INITIAL_PRODUCTS, FRANCHISE_STORES } from '../data/initialData';
import { ProductIcon } from './ProductIcon';
import { OrderTrackingDrawer } from './OrderTrackingDrawer';
import { Category, Town, Order } from '../types';
import { 
  Search, ShoppingCart, Plus, Minus, MapPin, Clock, ArrowRight, CheckCircle2, 
  Trash2, Phone, Sparkles, AlertCircle, ShoppingBag, X, Check, Eye,
  ArrowLeft, ShieldCheck, Ticket, CreditCard, Wallet, Percent, Bike
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const NEIGHBORHOODS: Record<Town, string[]> = {
  Jalgaon: [
    "Ravindra Nagar",
    "Khasbag Area",
    "Pratap Nagar",
    "Shahu Nagar",
    "Ganpati Nagar",
    "Ring Road Colony",
    "Khote Nagar",
    "Mehrun Lake Sector",
    "Prem Nagar",
    "Asha Baba Nagar"
  ],
  Shahada: [
    "Dongargaon Road",
    "Pusad Naka Area",
    "Teacher Colony",
    "Navjeevan Colony",
    "Ganesh Temple Lane",
    "Pratappur Sector",
    "Maharana Pratap Nagar",
    "Sardar Patel Colony",
    "Lonkheda Sector 1",
    "Mhada Colony"
  ],
  Nandurbar: [
    "Amrapali Colony",
    "Shivaji Nagar Area",
    "Subhash Chowk",
    "Karanpura Sector",
    "Vikas Nagar",
    "Korit Road Colony",
    "Lakkad Kot Lane",
    "Dondaicha Naka Area",
    "Gajanan Maharaj Nagar",
    "Moghalpura"
  ],
  Dhule: [
    "Deopur Main",
    "Mahindale Area",
    "Walwadi Sector",
    "Sakri Road Housing",
    "Jaihind Colony",
    "Mogra Nagar",
    "Chittod Road",
    "Parola Road Lane",
    "Datt Mandir Sector",
    "Bara Patthar Area"
  ]
};

export const CustomerApp: React.FC = () => {
  const {
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
    cart,
    addToCart,
    updateCartQuantity,
    clearCart,
    placeOrder,
    orders,
    updateOrderStatus,
    userLatLng,
    activeOrders,
    isTrackingDrawerOpen,
    setIsTrackingDrawerOpen,
    trackingOrderId,
    setTrackingOrderId,
    currentUser,
    updateWalletBalance,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [dualDockTab, setDualDockTab] = useState<'delivery' | 'cart'>('delivery');

  const [deliverySuccessBanner, setDeliverySuccessBanner] = useState<{ id: string; idShort: string } | null>(null);
  const [topToastMessage, setTopToastMessage] = useState<string | null>(null);
  const prevOrdersRef = React.useRef<Order[]>([]);

  React.useEffect(() => {
    orders.forEach((order) => {
      const prev = prevOrdersRef.current.find(o => o.id === order.id);
      if (prev && prev.status !== 'DELIVERED' && prev.status !== 'delivered') {
        if (order.status === 'DELIVERED' || order.status === 'delivered') {
          // It was just delivered!
          
          // 1. Instantly close/dismiss the Live Order Tracking Modal and bottom tracking bar on the customer screen
          setTrackingOrderId(null);
          setIsTrackingDrawerOpen(false);

          // 2. Show a quick toast notification at the top: "Order #NP-ORD-71604 Delivered! Enjoy your items 🎉"
          setTopToastMessage(`Order #${order.id} Delivered! Enjoy your items 🎉`);
          
          // Also set the green success banner state in case it's used elsewhere
          setDeliverySuccessBanner({
            id: order.id,
            idShort: order.id.replace('NP-ORD-', '')
          });
          
          setTimeout(() => {
            setDeliverySuccessBanner(null);
            setTopToastMessage(null);
          }, 5000);
        }
      }
    });
    prevOrdersRef.current = orders;
  }, [orders, setTrackingOrderId, setIsTrackingDrawerOpen]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 50) {
      setDualDockTab('delivery');
    } else if (info.offset.x < -50) {
      setDualDockTab('cart');
    }
  };

  // Flash sale countdown state: starts at 14 minutes and 32 seconds, ticks down live
  const [timeLeftSecs, setTimeLeftSecs] = useState(872);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSecs((prev) => {
        if (prev <= 1) {
          return 900; // Reset to 15 mins to keep the FOMO rolling
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Checkout states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'gpay' | 'phonepe' | 'upi' | 'wallet'>('gpay');
  const [upiId, setUpiId] = useState('john.doe@okaxis');
  
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Checkout Form State
  const [customerName, setCustomerName] = useState('John Doe');
  const [customerAddress, setCustomerAddress] = useState('45, Ravindra Nagar, ' + currentTown);
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [checkoutError, setCheckoutError] = useState('');
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [justPlacedOrder, setJustPlacedOrder] = useState<Order | null>(null);

  // Sync details from active user session in real-time
  React.useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name || 'John Doe');
      setCustomerPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // Sync selectedNeighborhood when town changes
  React.useEffect(() => {
    const list = NEIGHBORHOODS[currentTown] || [];
    if (list.length > 0 && !selectedNeighborhood) {
      setSelectedNeighborhood(list[0]);
    }
  }, [currentTown, selectedNeighborhood, setSelectedNeighborhood]);

  // Update compiled address when details or neighborhood changes
  React.useEffect(() => {
    const neighbor = selectedNeighborhood || 'Main Colony';
    const compiled = `${flatDetails ? flatDetails + ', ' : ''}${neighbor}, ${currentTown}`;
    setCustomerAddress(compiled);
  }, [selectedNeighborhood, flatDetails, currentTown]);

  const activeStore = useMemo(() => {
    return FRANCHISE_STORES.find(s => s.id === currentTown) || FRANCHISE_STORES[0];
  }, [currentTown]);

  const storeInventory = useMemo(() => {
    return inventories[currentTown] || {};
  }, [inventories, currentTown]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return INITIAL_PRODUCTS.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Cart math
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.localPrice * item.quantity, 0);
  }, [cart]);

  const deliveryFee = cartSubtotal > 200 ? 0 : 15;
  const cartTotal = cartSubtotal + deliveryFee;

  // Wallet and split-billing calculations for checkout screen
  const billBeforeWallet = useMemo(() => {
    return Math.max(0, cartSubtotal + deliveryFee + 10 + deliveryTip - appliedDiscount);
  }, [cartSubtotal, deliveryFee, deliveryTip, appliedDiscount]);

  const walletBalanceVal = currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250;
  const walletApplied = paymentMethod === 'wallet' ? Math.min(walletBalanceVal, billBeforeWallet) : 0;
  const finalBillToPay = Math.max(0, billBeforeWallet - walletApplied);

  // Active customer orders for live tracking
  const customerOrders = useMemo(() => {
    return orders.filter(o => o.storeId?.toLowerCase() === currentTown?.toLowerCase());
  }, [orders, currentTown]);

  const activeTrackingOrder = useMemo(() => {
    if (trackingOrderId) {
      const found = orders.find(o => o.id === trackingOrderId);
      if (found) {
        const s = found.status.toUpperCase();
        // NEVER render an order in the active live tracking drawer/side-panel if status === 'DELIVERED' or status === 'CANCELLED'
        if (s !== 'DELIVERED' && s !== 'CANCELLED' && (
          s === 'PLACED' ||
          s === 'PACKED' ||
          s === 'PREPARING' ||
          s === 'ACCEPTED' ||
          s === 'DISPATCHED' ||
          s === 'OUT_FOR_DELIVERY' ||
          s === 'OUT-FOR-DELIVERY'
        )) {
          return found;
        }
      }
    }
    return activeOrders[0] || null;
  }, [orders, activeOrders, trackingOrderId]);

  const categories: { id: Category | 'all'; label: string; emoji: string; color: string; bg: string }[] = [
    { id: 'all', label: 'All Items', emoji: '🏬', color: 'from-slate-700 to-slate-900', bg: 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' },
    { id: 'fruits-veg', label: 'Fresh Vegetables & Fruits', emoji: '🥦', color: 'from-emerald-400 to-green-600', bg: 'bg-emerald-50/70 border-emerald-100/80 text-emerald-900 hover:bg-emerald-50' },
    { id: 'dairy-bakery', label: 'Dairy & Bread', emoji: '🥛', color: 'from-blue-400 to-indigo-600', bg: 'bg-blue-50/70 border-blue-100/80 text-blue-900 hover:bg-blue-50' },
    { id: 'grocery', label: 'Instant Food & Noodles', emoji: '🍜', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50/70 border-amber-100/80 text-amber-900 hover:bg-amber-50' },
    { id: 'snacks-beverages', label: 'Cold Drinks & Juices', emoji: '🥤', color: 'from-red-400 to-pink-600', bg: 'bg-red-50/70 border-red-100/80 text-red-900 hover:bg-red-50' },
    { id: 'snacks-beverages', label: 'Snacks & Munchies', emoji: '🍪', color: 'from-yellow-400 to-amber-600', bg: 'bg-yellow-50/70 border-yellow-100/80 text-yellow-900 hover:bg-yellow-50' },
    { id: 'personal-care', label: 'Bath & Body', emoji: '🧴', color: 'from-teal-400 to-cyan-600', bg: 'bg-teal-50/70 border-teal-100/80 text-teal-900 hover:bg-teal-50' },
    { id: 'household', label: 'Cleaning Essentials', emoji: '🧼', color: 'from-purple-400 to-indigo-600', bg: 'bg-purple-50/70 border-purple-100/80 text-purple-900 hover:bg-purple-50' },
    { id: 'dairy-bakery', label: 'Sweets & Paan', emoji: '🍬', color: 'from-fuchsia-400 to-pink-600', bg: 'bg-fuchsia-50/70 border-fuchsia-100/80 text-fuchsia-900 hover:bg-fuchsia-50' },
  ];

  const handleCheckout = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
      setCheckoutError('Please fill out name, neighborhood, and contact details correctly.');
      return;
    }
    if (cartSubtotal < activeStore.minOrderValue) {
      setCheckoutError(`Minimum order value for ${currentTown} is ₹${activeStore.minOrderValue}`);
      return;
    }

    // Wallet calculation
    const billBeforeWallet = Math.max(0, cartSubtotal + deliveryFee + 10 + deliveryTip - appliedDiscount);
    const availableWallet = currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250;
    const isWalletSelected = paymentMethod === 'wallet';
    const walletApplied = isWalletSelected ? Math.min(availableWallet, billBeforeWallet) : 0;

    setCheckoutError('');

    // Deduct spent wallet balance in real-time
    if (isWalletSelected && walletApplied > 0) {
      updateWalletBalance(availableWallet - walletApplied);
    }

    const placed = placeOrder(
      customerName,
      customerAddress,
      customerPhone,
      currentTown,
      userLatLng?.lat,
      userLatLng?.lng
    );
    if (placed) {
      setJustPlacedOrder(placed);
      setTrackingOrderId(placed.id);
      setShowOrderSuccess(true);
      setIsCartOpen(false);
      setIsCheckingOut(false);
      setFlatDetails('Apartment 204, Block-B, near landmark');
      setPromoCode('');
      setAppliedDiscount(0);
      setPromoSuccess('');
      setPromoError('');
    }
  };

  // Promo code validation
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccess('');
    const code = promoCode.trim().toUpperCase();
    if (code === 'FRESH10') {
      const discount = Math.round(cartSubtotal * 0.1);
      setAppliedDiscount(discount);
      setPromoSuccess(`FRESH10 applied! 10% discount of ₹${discount} added.`);
    } else if (code === 'SUPER50') {
      if (cartSubtotal < 500) {
        setPromoError('SUPER50 requires a minimum order of ₹500.');
        return;
      }
      setAppliedDiscount(50);
      setPromoSuccess('SUPER50 applied! Flat ₹50 discount added.');
    } else if (code === '') {
      setPromoError('Please enter a promo code.');
    } else {
      setPromoError('Invalid promo code. Try FRESH10 or SUPER50!');
    }
  };

  return (
    <div className="py-6">
      {isCheckingOut ? (
        <div className="space-y-8 animate-fade-in">
          {/* Secure Checkout Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <button
              onClick={() => setIsCheckingOut(false)}
              className="flex items-center gap-2 text-slate-600 hover:text-emerald-700 font-extrabold text-xs transition-all bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs hover:scale-[1.01] self-start"
            >
              <ArrowLeft size={14} /> Continue Shopping
            </button>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/40">
              <ShieldCheck size={14} className="text-emerald-600" /> Secure 256-Bit SSL Checkout
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left main areas: Delivery Address Selector & Payment Selection */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Delivery Address Selector */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">1. Delivery Address Selector</h3>
                    <p className="text-xs text-slate-400">Choose your precise neighborhood in any franchise town</p>
                  </div>
                </div>

                {/* Town Switcher inside Checkout */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Select Franchise Town</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Jalgaon', 'Shahada', 'Nandurbar', 'Dhule'] as Town[]).map((townName) => (
                      <button
                        key={townName}
                        type="button"
                        onClick={() => {
                          setCurrentTown(townName);
                        }}
                        className={`py-3 px-2 rounded-2xl text-xs font-black transition-all border text-center ${
                          currentTown === townName
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/15 scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {townName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Neighborhood selector */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Choose Neighborhood in {currentTown}</label>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {NEIGHBORHOODS[currentTown]?.length || 0} Areas Connected
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                    {NEIGHBORHOODS[currentTown].map((neigh) => (
                      <button
                        key={neigh}
                        type="button"
                        onClick={() => setSelectedNeighborhood(neigh)}
                        className={`p-3 rounded-2xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                          selectedNeighborhood === neigh
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-extrabold ring-1 ring-emerald-400'
                            : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{neigh}</span>
                        {selectedNeighborhood === neigh && <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional inputs */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Receiver Name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Receiver Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">Complete Home Address Details</label>
                  <input
                    type="text"
                    required
                    value={flatDetails}
                    onChange={(e) => setFlatDetails(e.target.value)}
                    placeholder="e.g. Flat 302, Wing-A, Royal Heights, behind Ganesh Temple"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                  <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-500 border border-slate-200/40">
                    <span className="font-bold">Assembled Address: </span>
                    <span className="italic font-mono text-slate-600">{customerAddress}</span>
                  </div>
                </div>
              </div>

              {/* Payment Selector section */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">2. Secure Payment Selection</h3>
                    <p className="text-xs text-slate-400">Select your preferred payment app for instant authorization</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Google Pay */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('gpay');
                      setUpiId(`${customerName.toLowerCase().replace(/\s+/g, '')}@okaxis`);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center relative ${
                      paymentMethod === 'gpay'
                        ? 'bg-blue-50/50 border-blue-400 text-blue-900 ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black">Google Pay</p>
                      <p className="text-[10px] text-blue-600 font-semibold mt-0.5">GPay UPI</p>
                    </div>
                    {paymentMethod === 'gpay' && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white p-0.5 rounded-full">
                        <Check size={10} />
                      </div>
                    )}
                  </button>

                  {/* PhonePe */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('phonepe');
                      setUpiId(`${customerPhone.replace(/[^0-9]/g, '') || '9876543210'}@ybl`);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center relative ${
                      paymentMethod === 'phonepe'
                        ? 'bg-purple-50/50 border-purple-400 text-purple-900 ring-1 ring-purple-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black">PhonePe</p>
                      <p className="text-[10px] text-purple-600 font-semibold mt-0.5">PhonePe UPI</p>
                    </div>
                    {paymentMethod === 'phonepe' && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white p-0.5 rounded-full">
                        <Check size={10} />
                      </div>
                    )}
                  </button>

                  {/* UPI */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('upi');
                      setUpiId('username@bankid');
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center relative ${
                      paymentMethod === 'upi'
                        ? 'bg-emerald-50/50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Percent size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black">BHIM UPI</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Any UPI App</p>
                    </div>
                    {paymentMethod === 'upi' && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white p-0.5 rounded-full">
                        <Check size={10} />
                      </div>
                    )}
                  </button>

                  {/* Navjeevan Cash / Wallet */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('wallet');
                      setUpiId(`${customerName.toLowerCase().replace(/\s+/g, '')}@okaxis`);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center relative ${
                      paymentMethod === 'wallet'
                        ? 'bg-indigo-50/50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black">Navjeevan Cash</p>
                      <p className="text-[10px] text-indigo-600 font-extrabold mt-0.5">₹{currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250} Available</p>
                    </div>
                    {paymentMethod === 'wallet' && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white p-0.5 rounded-full">
                        <Check size={10} />
                      </div>
                    )}
                  </button>
                </div>

                {paymentMethod === 'wallet' ? (
                  (currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250) >= Math.max(0, cartSubtotal + deliveryFee + 10 + deliveryTip - appliedDiscount) ? (
                    <div className="bg-indigo-50 border border-indigo-150 p-4.5 rounded-2xl text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs animate-bounce">
                        <Sparkles size={18} className="text-indigo-600 fill-indigo-200" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-indigo-950">Wallet Covers 100% of the Bill! 🎉</p>
                        <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Remaining UPI amount to pay: ₹0. Instant 1-tap checkout enabled.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl space-y-3">
                      <p className="text-xs font-extrabold text-amber-900">Insufficient Wallet Balance (Available: ₹{currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250})</p>
                      <p className="text-[10px] text-amber-700 font-medium">Your wallet balance will be applied, and the remaining ₹{Math.max(0, cartSubtotal + deliveryFee + 10 + deliveryTip - appliedDiscount - (currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250))} must be paid via UPI below:</p>
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-black text-slate-400 text-left">UPI ID for Remaining Balance</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="username@upi"
                          className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-800"
                        />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {paymentMethod === 'gpay' && 'Linked Google Pay UPI ID'}
                        {paymentMethod === 'phonepe' && 'Linked PhonePe UPI ID'}
                        {paymentMethod === 'upi' && 'Enter Custom UPI ID'}
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="username@upi"
                        className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-3 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-800"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-500" /> Insured with instant UPI request ping
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right main area: Final Bill Summary Window */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 space-y-5 sticky top-24">
                
                {/* Title */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Ticket size={18} className="text-emerald-600" /> Bill Summary
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
                  </span>
                </div>

                {/* Promo application */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Coupon Code</label>
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="FRESH10 or SUPER50"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 flex-grow uppercase font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                    />
                    <button
                      type="submit"
                      className="bg-slate-800 hover:bg-slate-955 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                    >
                      Apply
                    </button>
                  </form>
                  {promoError && (
                    <p className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                      <AlertCircle size={10} /> {promoError}
                    </p>
                  )}
                  {promoSuccess && (
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> {promoSuccess}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400">Use **FRESH10** for 10% off! Use **SUPER50** on orders above ₹500.</p>
                </div>

                {/* Serrated Invoice Style Container */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
                  
                  <div className="text-center pt-1 border-b border-dashed border-slate-200 pb-2 mb-2">
                    <h4 className="text-[11px] font-black text-slate-700 tracking-wider font-mono">ESTIMATE RECEIPT</h4>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span className="truncate max-w-[150px]">{item.product.name} (x{item.quantity})</span>
                        <span>₹{item.localPrice * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-2.5 space-y-1.5 text-xs font-mono text-slate-500">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span>₹{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Handling & Packaging Fee</span>
                      <span>₹10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>10-Min Delivery Charge</span>
                      <span>
                        {deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee}`}
                      </span>
                    </div>
                    {deliveryTip > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Rider Delivery Tip</span>
                        <span>₹{deliveryTip}</span>
                      </div>
                    )}
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Promo Discount</span>
                        <span>-₹{appliedDiscount}</span>
                      </div>
                    )}
                    {paymentMethod === 'wallet' && walletApplied > 0 && (
                      <div className="flex justify-between text-indigo-600 font-black">
                        <span>Navjeevan Cash Applied</span>
                        <span>-₹{walletApplied}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 text-xs font-black text-slate-800 font-sans">
                      <span>Grand Total</span>
                      <span className="text-emerald-700 text-sm font-black">₹{finalBillToPay}</span>
                    </div>
                  </div>
                </div>

                {checkoutError && (
                  <div className="text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl flex items-center gap-1 border border-red-100">
                    <AlertCircle size={14} className="flex-shrink-0" /> {checkoutError}
                  </div>
                )}

                <button
                  id="checkout-pay-btn"
                  onClick={() => handleCheckout()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01]"
                >
                  {paymentMethod === 'wallet' && finalBillToPay === 0 ? (
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={16} className="text-amber-400 fill-amber-400 animate-spin" /> Instant 1-Tap Wallet Checkout <ArrowRight size={16} />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Pay ₹{finalBillToPay} & Place Order <ArrowRight size={16} />
                    </span>
                  )}
                </button>

                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-1">
                    <ShieldCheck size={12} className="text-slate-400" /> Instant OTP notification sent to {customerPhone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Local Store Information Ribbon */}
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 mb-6 relative overflow-hidden border border-emerald-500/20 shadow-xl shadow-emerald-950/20">
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
              <ShoppingBag size={200} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-black tracking-widest uppercase mb-1 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shadow-[0_0_8px_#f97316]"></span>
                  <span>Matching Nearest Franchise Store</span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">{activeStore.name}</h1>
                <p className="text-sm text-emerald-200/90 mt-1 flex items-center gap-1">
                  <MapPin size={14} className="flex-shrink-0 text-orange-400" />
                  {activeStore.address}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-emerald-950/60 p-4 rounded-2xl border border-emerald-500/20 backdrop-blur-xs self-start md:self-auto">
                <div className="text-center border-r border-emerald-500/20 pr-4">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-300 font-mono">Delivery in</span>
                  <span className="text-lg font-black text-orange-400 flex items-center justify-center gap-1 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">
                    <Clock size={16} className="text-orange-400 animate-pulse" /> {activeStore.deliveryTimeMins} Min
                  </span>
                </div>
                <div className="text-left">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-300 font-mono">Store Helpline</span>
                  <span className="text-sm font-bold text-white block">{activeStore.contact}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Premium Flash Sale Banner with Countdown */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-orange-950 text-white rounded-3xl p-5 mb-6 relative overflow-hidden border border-orange-500/30 shadow-[0_4px_25px_rgba(249,115,22,0.12)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="bg-gradient-to-br from-orange-500 to-yellow-400 p-3 rounded-2xl text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse">
                  <Sparkles size={24} className="text-white fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                      FLASH DEALS
                    </span>
                    <span className="text-amber-400 text-xs font-bold animate-pulse">⚡ 40% OFF ACTIVE</span>
                  </div>
                  <h2 className="text-lg font-extrabold tracking-tight mt-1 text-white">
                    Lightning Fresh Sale Ending Soon!
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">
                    Grab bestselling mangoes & fresh dairy. Discount applied automatically at checkout!
                  </p>
                </div>
              </div>
              
              {/* Live Countdown Clock */}
              <div className="flex items-center gap-3 bg-slate-950/75 border border-orange-500/20 px-4 py-2 rounded-2xl shadow-inner backdrop-blur-md self-stretch md:self-auto justify-between">
                <div className="text-left">
                  <span className="block text-[9px] uppercase font-black tracking-wider text-orange-400">Offer Expires In</span>
                  <span className="text-lg font-mono font-black text-white tracking-widest drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                    {formatTime(timeLeftSecs)}
                  </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              </div>
            </div>
          </div>

          {/* Quick Delivery Town Switcher (Mobile/Tablet Helper) */}
          <div className="md:hidden flex items-center space-x-2 bg-slate-100 p-3 rounded-2xl mb-6 border border-slate-200">
            <MapPin size={16} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Deliver to:</span>
            <select
              id="town-selector-mobile"
              value={currentTown}
              onChange={(e) => setCurrentTown(e.target.value as Town)}
              className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none flex-grow"
            >
              {FRANCHISE_STORES.map(s => (
                <option key={s.id} value={s.id}>{s.id} Super Shop ({s.deliveryTimeMins}m)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left main area (Storefront Catalog) */}
            <div className={`${activeTrackingOrder ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
              
              {/* Zepto Category Grid */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-xs space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <span className="text-sm font-black text-slate-800 tracking-tight">Shop by Category</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                  {categories.map((cat, idx) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <motion.button
                        key={idx}
                        id={`cat-grid-${cat.id}-${idx}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-2 relative h-24 overflow-hidden group ${cat.bg} ${
                          isActive 
                            ? 'ring-2 ring-emerald-600 shadow-md scale-[1.01] border-transparent bg-gradient-to-br from-white to-emerald-50/20' 
                            : 'shadow-xs hover:shadow-md'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center text-lg shadow-xs group-hover:scale-105 transition-transform duration-300`}>
                          {cat.emoji}
                        </div>
                        <span className="text-[10px] font-black leading-tight text-slate-800 line-clamp-2">
                          {cat.label}
                        </span>
                        {isActive && (
                          <div className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs">
                            <Check size={8} className="stroke-[4]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Search Box */}
              <div className="relative bg-white rounded-2xl shadow-xs border border-slate-100 p-1.5 flex items-center">
                <div className="pl-3.5 pr-2.5 text-slate-400">
                  <Search size={18} />
                </div>
                <input
                  id="product-search-input"
                  type="text"
                  placeholder="Search vegetables, dairy, biscuits, cold drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 mr-2"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Catalog Head */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{selectedCategory === 'all' ? 'All Available Products' : categories.find(c => c.id === selectedCategory)?.label}</span>
                  <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {filteredProducts.length} Items
                  </span>
                </h2>
              </div>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center">
                  <ShoppingBag className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500 text-sm">No products match your search/filters right now.</p>
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => {
                    const localInfo = storeInventory[product.id] || { price: product.price, stock: 20, isAvailable: true };
                    const inCart = cart.find(item => item.product.id === product.id);
                    const isOutOfStock = localInfo.stock === 0;
                    const isLowStock = localInfo.stock > 0 && localInfo.stock <= 4;
                    const isBestseller = ['fv-mango', 'db-paneer', 'sb-maggi'].includes(product.id);

                    return (
                      <div
                        key={product.id}
                        id={`prod-card-${product.id}`}
                        className={`bg-white rounded-3xl border transition-all duration-500 relative flex flex-col justify-between overflow-hidden group ${
                          isOutOfStock 
                            ? 'border-slate-100 opacity-65 bg-slate-50/50' 
                            : isBestseller
                              ? 'border-orange-500 shadow-[0_4px_20px_rgba(249,115,22,0.12)] animate-glow-best'
                              : 'border-slate-200/60 hover:shadow-xl hover:shadow-slate-200/50 hover:border-emerald-500'
                        }`}
                      >
                        {/* Clean Card Backing - High-Res Product Image Container */}
                        <div className="relative h-32 w-full bg-slate-50/50 flex items-center justify-center overflow-hidden border-b border-slate-100 p-1">
                          {product.imageUrl && !failedImages[product.id] ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                              onError={() => {
                                  setFailedImages(prev => ({ ...prev, [product.id]: true }));
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center rounded-2xl group-hover:scale-105 transition-transform duration-500">
                              <span className="text-emerald-700 font-extrabold text-3xl tracking-tight select-none">
                                {product.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          
                          {/* Subtle shade overlay to ensure floating pill badges stand out */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />

                          {/* Floating Elegant Pill Badges */}
                          {isOutOfStock ? (
                            <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md z-10">
                              Sold Out
                            </div>
                          ) : isBestseller ? (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-[0_2px_10px_rgba(249,115,22,0.35)] flex items-center gap-1 z-10">
                              <Sparkles size={8} className="text-white fill-white animate-pulse" /> Bestseller
                            </div>
                          ) : isLowStock ? (
                            <div className="absolute top-2 right-2 bg-amber-500/95 backdrop-blur-xs text-slate-900 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 z-10">
                              <AlertCircle size={9} /> Only {localInfo.stock} Left!
                            </div>
                          ) : null}
                        </div>

                        {/* Card details */}
                        <div className="p-3.5 flex-grow flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                              {product.category.replace('-', ' & ')}
                            </span>
                            <h3 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2 h-10 group-hover:text-emerald-700 transition-colors">
                              {product.name}
                            </h3>
                            <p className="text-xs text-slate-400 font-semibold mt-1">{product.unit}</p>
                          </div>

                          <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline">
                                <span className="text-xs font-black text-slate-800">₹</span>
                                <span className="text-base font-black text-slate-800">{localInfo.price}</span>
                              </div>
                            </div>

                            {/* Interactive Quantity Stepper with Spring-Pop animation */}
                            {isOutOfStock ? (
                              <span className="text-xs font-extrabold text-red-500 bg-red-50/50 px-2.5 py-1 rounded-lg">Unavailable</span>
                            ) : (
                              <div className="relative h-9 min-w-[85px] flex items-center justify-end">
                                <AnimatePresence mode="wait">
                                  {inCart ? (
                                    <motion.div
                                      key="stepper"
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.8, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                      className="flex items-center bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-[0_4px_10px_rgba(249,115,22,0.3)] border border-orange-600 overflow-hidden h-8"
                                    >
                                      <button
                                        id={`qty-minus-${product.id}`}
                                        onClick={() => updateCartQuantity(product.id, inCart.quantity - 1)}
                                        className="px-2.5 py-1.5 hover:bg-orange-600/50 transition-colors font-black text-xs h-full"
                                      >
                                        <Minus size={11} />
                                      </button>
                                      <span className="px-1 text-xs font-black min-w-[14px] text-center font-mono">
                                        {inCart.quantity}
                                      </span>
                                      <button
                                        id={`qty-plus-${product.id}`}
                                        onClick={() => {
                                          if (inCart.quantity >= localInfo.stock) {
                                            alert(`Only ${localInfo.stock} units available in ${currentTown} store stock.`);
                                            return;
                                          }
                                          updateCartQuantity(product.id, inCart.quantity + 1);
                                        }}
                                        className="px-2.5 py-1.5 hover:bg-orange-600/50 transition-colors font-black text-xs h-full"
                                      >
                                        <Plus size={11} />
                                      </button>
                                    </motion.div>
                                  ) : (
                                    <motion.button
                                      key="add-btn"
                                      initial={{ scale: 1 }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      id={`add-btn-${product.id}`}
                                      onClick={() => addToCart(product, localInfo.price)}
                                      className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-100 hover:border-emerald-600 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-xs h-8"
                                    >
                                      ADD
                                    </motion.button>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right side panel (Active Tracker Only) */}
            {activeTrackingOrder && (
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block">Live Order Status</span>
                      <span className="text-sm font-black font-mono mt-0.5 block">{activeTrackingOrder.id}</span>
                    </div>
                    <div className="bg-slate-800 text-[10px] font-bold px-2 py-1 rounded-lg text-slate-300">
                      {activeTrackingOrder.storeId} Branch
                    </div>
                  </div>

                  {/* Status Stepper Tracker */}
                  {(() => {
                    const statusLower = activeTrackingOrder.status.toLowerCase();
                    const stepIndex = 
                      statusLower === 'placed' ? 1 :
                      ['preparing', 'accepted', 'packed'].includes(statusLower) ? 2 :
                      ['dispatched', 'out-for-delivery', 'out_for_delivery'].includes(statusLower) ? 3 :
                      statusLower === 'delivered' ? 4 : 1;

                    return (
                      <>
                        <div className="space-y-4 py-2 border-y border-slate-800">
                          {/* Step 1: Placed */}
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                stepIndex >= 1
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {stepIndex > 1 ? <Check size={12} /> : '1'}
                              </div>
                              <div className={`w-0.5 h-6 ${
                                stepIndex >= 2 ? 'bg-emerald-500' : 'bg-slate-800'
                              }`} />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${stepIndex >= 1 ? 'text-white' : 'text-slate-500'}`}>
                                Order Placed
                              </p>
                              <p className="text-[10px] text-slate-400">Navjeevan Plus has accepted your request</p>
                            </div>
                          </div>

                          {/* Step 2: Preparing */}
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                stepIndex >= 2
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {stepIndex > 2 ? <Check size={12} /> : '2'}
                              </div>
                              <div className={`w-0.5 h-6 ${
                                stepIndex >= 3 ? 'bg-emerald-500' : 'bg-slate-800'
                              }`} />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${stepIndex >= 2 ? 'text-white' : 'text-slate-500'}`}>
                                Packing & Preparing
                              </p>
                              <p className="text-[10px] text-slate-400">Store agents are picking fresh items</p>
                            </div>
                          </div>

                          {/* Step 3: Out for Delivery */}
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                stepIndex >= 3
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {stepIndex > 3 ? <Check size={12} /> : '3'}
                              </div>
                              <div className={`w-0.5 h-6 ${
                                stepIndex >= 4 ? 'bg-emerald-500' : 'bg-slate-800'
                              }`} />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${stepIndex >= 3 ? 'text-white' : 'text-slate-500'}`}>
                                Out for Delivery (Dispatched)
                              </p>
                              <p className="text-[10px] text-slate-400">Rider is speeding towards your door</p>
                            </div>
                          </div>

                          {/* Step 4: Delivered */}
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all bg-slate-800 text-slate-400"
                              style={{
                                backgroundColor: stepIndex >= 4 ? '#10b981' : undefined,
                                color: stepIndex >= 4 ? '#022c22' : undefined
                              }}
                            >
                              {stepIndex >= 4 ? <CheckCircle2 size={13} /> : '4'}
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${stepIndex >= 4 ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}`}>
                                Handed Over - Delivered
                              </p>
                              <p className="text-[10px] text-slate-400">Order delivered! Enjoy your fresh items.</p>
                            </div>
                          </div>
                        </div>

                        {/* Countdown or Status Info */}
                        {statusLower === 'delivered' ? (
                          <div className="bg-emerald-950 border border-emerald-900 rounded-2xl p-4 text-center space-y-3">
                            <div className="flex justify-between items-center bg-emerald-900/40 p-3 rounded-2xl">
                              <div className="flex items-center gap-2">
                                <div className="bg-emerald-500 text-slate-900 p-1.5 rounded-lg animate-pulse">
                                  <Clock size={16} />
                                </div>
                                <div className="text-left">
                                  <span className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider font-sans">Status</span>
                                  <span className="text-xs font-black text-white">Delivered Just Now</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  alert("Thank you for your rating! ⭐⭐⭐⭐⭐");
                                  setTrackingOrderId(null);
                                  setIsTrackingDrawerOpen(false);
                                }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10"
                              >
                                Rate & Review
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTrackingOrderId(null);
                                  setIsTrackingDrawerOpen(false);
                                }}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all border border-slate-700"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ) : statusLower === 'cancelled' ? (
                          <div className="bg-red-950 border border-red-900 rounded-2xl p-3 text-center">
                            <p className="text-xs font-bold text-red-400">Order Cancelled 🚫</p>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center bg-slate-800 p-3.5 rounded-2xl">
                            <div className="flex items-center gap-2">
                              <div className="bg-amber-400 text-slate-900 p-1.5 rounded-lg animate-pulse">
                                <Clock size={16} />
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estimated In</span>
                                <span className="text-sm font-black text-white">{activeTrackingOrder.estimatedDeliveryTime} Mins</span>
                              </div>
                            </div>
                            
                            {activeTrackingOrder.riderName ? (
                              <div className="text-right">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rider Partner</span>
                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                  <Phone size={10} /> {activeTrackingOrder.riderName}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className="block text-[9px] font-bold text-amber-500 animate-pulse">Rider Assignment</span>
                                <span className="text-xs text-slate-400">Assigning local pilot...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Order cancellation trigger */}
                  {activeTrackingOrder.status === 'placed' && (
                    <button
                      id="cancel-order-btn"
                      onClick={() => {
                        if (confirm('Do you really want to cancel this order?')) {
                          updateOrderStatus(activeTrackingOrder.id, 'cancelled');
                        }
                      }}
                      className="w-full bg-transparent hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-bold py-2 border border-red-500/20 hover:border-red-500/50 rounded-xl transition-all"
                    >
                      Cancel Order
                    </button>
                  )}

                  {/* History / Multiple orders lookup */}
                  {customerOrders.length > 1 && (
                    <div className="pt-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Track Another Order:</label>
                      <select
                        value={trackingOrderId || ''}
                        onChange={(e) => setTrackingOrderId(e.target.value)}
                        className="w-full text-[10px] font-mono bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-slate-300 focus:outline-none"
                      >
                        {customerOrders.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.id} ({o.status.toUpperCase()}) - {o.items.length} items
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modern Order Placement Animated Success Modal */}
      <AnimatePresence>
        {showOrderSuccess && justPlacedOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative border border-slate-100"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4 shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-black text-slate-800 tracking-tight">Order Placed! 🚀</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your order <span className="font-mono font-bold text-slate-800">{justPlacedOrder.id}</span> has been routed to the <span className="font-bold text-emerald-700">{justPlacedOrder.storeId}</span> franchise.
              </p>

              {/* Receipt details */}
              <div className="my-4 bg-slate-50 rounded-2xl p-3.5 text-left text-xs font-medium text-slate-600 font-mono space-y-1">
                <div className="flex justify-between border-b border-slate-200 pb-1.5 mb-1.5 text-slate-800 font-bold">
                  <span>Receipt Info</span>
                  <span>₹{justPlacedOrder.total}</span>
                </div>
                {justPlacedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[180px]">{item.name}</span>
                    <span>{item.quantity}x</span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 rounded-2xl p-3 text-emerald-800 text-[11px] font-bold mb-5">
                ⚡ Estimated delivery in just {activeStore.deliveryTimeMins} minutes!
              </div>

              <button
                id="success-dismiss-btn"
                onClick={() => setShowOrderSuccess(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold py-3 rounded-2xl transition-all"
              >
                Track Live Delivery
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zepto-Style Bottom Floating Cart Bar */}
      {cart.length > 0 && !isCheckingOut && !isCartOpen && activeOrders.length === 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
          <motion.button
            id="floating-cart-bar"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-slate-800 relative overflow-hidden group"
          >
            {/* Ambient shimmer */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0)_100%)] animate-shimmer-fast" style={{ backgroundSize: '200% 100%' }} />
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl flex items-center justify-center">
                <ShoppingCart size={18} className="stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-black text-white">{cart.length} Item{cart.length > 1 ? 's' : ''} added</span>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">⚡ Fresh from nearest store</span>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <div className="text-right mr-1">
                <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest font-mono">Grand Total</span>
                <span className="text-sm font-black text-emerald-400 font-mono">₹{cartSubtotal + (cartSubtotal > 200 ? 0 : 15) + 10 + deliveryTip}</span>
              </div>
              <div className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md">
                <span>View Cart</span>
                <ArrowRight size={13} className="stroke-[3]" />
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* Dual Bottom Bar Dock (If BOTH active orders AND cart items exist) */}
      {activeOrders.length > 0 && cart.length > 0 && !isCheckingOut && !isCartOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
          {/* Tab Switcher Pills Above the Bar */}
          <div className="flex justify-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => setDualDockTab('delivery')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 border ${
                dualDockTab === 'delivery'
                  ? 'bg-slate-900 border-slate-950 text-white shadow-md shadow-slate-950/20 scale-[1.03]'
                  : 'bg-white/95 border-slate-200 text-slate-500 hover:text-slate-800 shadow-2xs'
              }`}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Delivery ({activeOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDualDockTab('cart')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 border ${
                dualDockTab === 'cart'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-600/20 scale-[1.03]'
                  : 'bg-white/95 border-slate-200 text-slate-500 hover:text-slate-800 shadow-2xs'
              }`}
            >
              <ShoppingCart size={11} />
              <span>Cart ({cart.length})</span>
            </button>
          </div>

          {/* Swipeable Bottom Dock Card */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-slate-200/85 bg-white p-1">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="cursor-grab active:cursor-grabbing"
            >
              <AnimatePresence mode="wait">
                {dualDockTab === 'delivery' ? (
                  <motion.div
                    key="delivery-bar"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsTrackingDrawerOpen(true)}
                    className="bg-slate-900 text-white rounded-2xl p-3.5 flex items-center justify-between hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-emerald-500/15 text-emerald-400 p-2.5 rounded-xl shrink-0 flex items-center justify-center animate-pulse">
                        <Bike size={18} className="stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="block text-xs font-black text-white truncate">
                            {activeOrders.length === 1 
                              ? `Order #${activeOrders[0].id.replace('NP-ORD-', '')}` 
                              : `${activeOrders.length} Active Orders in Transit`}
                          </span>
                          {activeOrders.length > 1 && (
                            <span className="bg-emerald-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0">
                              Multi
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <Clock size={10} className="text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {activeOrders.length === 1 
                              ? `Arriving in ${Math.max(1, activeOrders[0].estimatedDeliveryTime || 8)} mins` 
                              : `Track all active deliveries live`}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1 shadow-md shrink-0">
                      <span>Track Live</span>
                      <ArrowRight size={12} className="stroke-[3]" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cart-bar"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsCartOpen(true)}
                    className="bg-slate-900 text-white rounded-2xl p-3.5 flex items-center justify-between hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl shrink-0 flex items-center justify-center">
                        <ShoppingCart size={18} className="stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black text-white truncate">
                          {cart.length} Item{cart.length > 1 ? 's' : ''} • ₹{cartSubtotal}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono flex items-center gap-1 mt-0.5">
                          ⚡ Add more or checkout
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right mr-1.5 hidden sm:block">
                        <span className="block text-[8px] text-slate-400 uppercase font-black tracking-widest font-mono">Total</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">₹{cartSubtotal + (cartSubtotal > 200 ? 0 : 15) + 10 + deliveryTip}</span>
                      </div>
                      <div className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1 shadow-md">
                        <span>View Cart</span>
                        <ArrowRight size={12} className="stroke-[3]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Swipe gesture Indicator Dots */}
            <div className="flex justify-center gap-1.5 py-1.5 bg-slate-50/50 rounded-b-2xl border-t border-slate-100">
              <span className={`h-1.5 rounded-full transition-all duration-300 ${dualDockTab === 'delivery' ? 'w-4 bg-slate-850' : 'w-1.5 bg-slate-350'}`} />
              <span className={`h-1.5 rounded-full transition-all duration-300 ${dualDockTab === 'cart' ? 'w-4 bg-emerald-600' : 'w-1.5 bg-slate-350'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Zepto-Style Sliding Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
                    <ShoppingCart size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">My Basket</h3>
                    <p className="text-[10px] text-slate-500 font-medium">⚡ {cart.length} item{cart.length > 1 ? 's' : ''} ready to pack</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-[11px] font-black text-slate-400 hover:text-red-500 flex items-center gap-1 bg-white border border-slate-200/60 px-2.5 py-1.5 rounded-xl transition-all"
                    >
                      <Trash2 size={11} /> Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              {cart.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4 animate-bounce">
                    <ShoppingBag size={28} />
                  </div>
                  <h4 className="text-base font-black text-slate-800">Your basket is empty</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Add fresh vegetables, dairy, milk, masala, or biscuits from Navjeevan Plus catalog to start!
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-6 py-3 rounded-2xl shadow-md transition-all"
                  >
                    Browse Grocery items
                  </button>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto p-4 space-y-5 scrollbar-thin">
                  
                  {/* Superfast Delivery Banner */}
                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-4 border border-emerald-500/20 relative overflow-hidden flex items-center gap-3">
                    <div className="absolute right-0 top-0 opacity-10 font-mono text-[70px] select-none font-black translate-x-3 translate-y-3">10</div>
                    <div className="bg-emerald-600 text-white p-2.5 rounded-xl flex items-center justify-center animate-pulse shadow-md">
                      <Clock size={18} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-black text-emerald-800 tracking-wider font-mono">Superfast Delivery</span>
                      <p className="text-xs font-black text-slate-800 mt-0.5">Arriving in <span className="text-emerald-700">10 Mins</span> guaranteed!</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">To: {currentTown} ({selectedNeighborhood})</p>
                    </div>
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-3.5">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">Packed Items</span>
                    <div className="space-y-3">
                      {cart.map((item) => {
                        const localStock = inventories[currentTown]?.[item.product.id]?.stock || 0;
                        return (
                          <div key={item.product.id} className="flex justify-between items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Thumbnail Image Container */}
                              <div className="w-11 h-11 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {item.product.imageUrl && !failedImages[item.product.id] ? (
                                  <img 
                                    src={item.product.imageUrl} 
                                    alt={item.product.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={() => {
                                      setFailedImages(prev => ({ ...prev, [item.product.id]: true }));
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
                                    <span className="text-emerald-700 font-extrabold text-sm">{item.product.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 text-xs truncate leading-snug">{item.product.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.product.unit} · ₹{item.localPrice}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs font-black text-slate-800 font-mono">₹{item.localPrice * item.quantity}</span>
                              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-xs h-7">
                                <button
                                  onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                  className="px-2 hover:bg-slate-200/80 transition-colors text-slate-600 h-full flex items-center justify-center"
                                >
                                  <Minus size={9} className="stroke-[3]" />
                                </button>
                                <span className="px-1 text-[11px] font-black text-slate-800 font-mono min-w-[14px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => {
                                    if (item.quantity >= localStock) {
                                      alert(`Only ${localStock} units available.`);
                                      return;
                                    }
                                    updateCartQuantity(item.product.id, item.quantity + 1);
                                  }}
                                  className="px-2 hover:bg-slate-200/80 transition-colors text-slate-600 h-full flex items-center justify-center"
                                >
                                  <Plus size={9} className="stroke-[3]" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Instruction Selector Pills */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Rider Delivery Instructions</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Avoid ringing bell', icon: '🔕' },
                        { label: 'Leave at door', icon: '🚪' },
                        { label: 'Leave with security', icon: '👮' },
                        { label: 'Call before arriving', icon: '📞' }
                      ].map((pill) => {
                        const isSelected = deliveryInstruction === pill.label;
                        return (
                          <button
                            key={pill.label}
                            type="button"
                            onClick={() => setDeliveryInstruction(isSelected ? '' : pill.label)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-600/10 scale-[1.01]'
                                : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                            }`}
                          >
                            <span>{pill.icon}</span>
                            <span>{pill.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Tip Selector */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Support your local pilot</span>
                      {deliveryTip > 0 && (
                        <button 
                          onClick={() => setDeliveryTip(0)}
                          className="text-[10px] font-black text-red-500 hover:underline"
                        >
                          Remove Tip
                        </button>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                      <p className="text-[11px] text-slate-500 leading-normal font-medium">
                        Your delivery pilot goes above and beyond to pack and deliver fresh food in 10 minutes. 100% of tips go directly to them!
                      </p>
                      <div className="flex gap-2">
                        {[20, 30, 50].map((val) => {
                          const isSelected = deliveryTip === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setDeliveryTip(isSelected ? 0 : val)}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-transparent shadow-lg shadow-slate-900/15'
                                  : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-sm">₹{val}</span>
                              <span className={`text-[9px] font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {val === 20 ? 'Good' : val === 30 ? 'Awesome' : 'Super pilot'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bill Details Summary Card */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">Detailed Bill receipt</span>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2 text-xs font-medium text-slate-600 font-mono">
                      <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span className="font-bold text-slate-800">₹{cartSubtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Franchise Packing Fee</span>
                        <span className="font-bold text-slate-800">₹10</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Superfast Delivery Fee</span>
                        <span className="font-bold text-slate-800">
                          {deliveryFee === 0 ? <span className="text-emerald-600 font-extrabold font-sans">FREE</span> : `₹${deliveryFee}`}
                        </span>
                      </div>
                      {deliveryTip > 0 && (
                        <div className="flex justify-between text-slate-700">
                          <span>Delivery Pilot Tip</span>
                          <span className="font-bold text-slate-800">₹{deliveryTip}</span>
                        </div>
                      )}
                      
                      {/* Dynamic Free Delivery tracker inside Drawer */}
                      {cartSubtotal < 200 && (
                        <div className="pt-2 border-t border-dashed border-slate-200 mt-1 flex items-center justify-between text-[10px] text-orange-600 font-sans font-bold">
                          <span>Add ₹{200 - cartSubtotal} more for FREE Delivery!</span>
                          <span className="font-black font-mono">₹15 Delivery Charge</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-2.5 border-t border-slate-200 text-sm font-black text-slate-800 font-sans">
                        <span>Grand Total</span>
                        <span className="text-emerald-700 font-black text-base">₹{cartSubtotal + deliveryFee + 10 + deliveryTip}</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Drawer Bottom Action Panel */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-white">
                  {cartSubtotal < activeStore.minOrderValue ? (
                    <div className="text-center bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs font-bold text-amber-800 shadow-inner">
                      Min. Order value for {currentTown} store is ₹{activeStore.minOrderValue}. Please add ₹{activeStore.minOrderValue - cartSubtotal} more.
                    </div>
                  ) : (
                    <button
                      id="drawer-checkout-btn"
                      onClick={() => {
                        setIsCheckingOut(true);
                        setIsCartOpen(false);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-4 rounded-2xl shadow-lg shadow-emerald-600/10 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01]"
                    >
                      Proceed to Checkout <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Quick Toast Notification */}
      <AnimatePresence>
        {topToastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
            <motion.div
              initial={{ y: -80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-emerald-600 border border-emerald-500 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/25 text-white p-2 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black tracking-tight">{topToastMessage}</h4>
                </div>
              </div>
              <button
                onClick={() => setTopToastMessage(null)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all shrink-0 border border-emerald-500/20"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <OrderTrackingDrawer />

      {/* 5-Second Green Success Banner */}
      <AnimatePresence>
        {deliverySuccessBanner && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-emerald-600 border border-emerald-500 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 text-white p-2 rounded-xl flex items-center justify-center animate-bounce">
                  <CheckCircle2 size={20} className="stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black tracking-tight">Order #{deliverySuccessBanner.idShort} Delivered 🎉</h4>
                  <p className="text-[10px] text-emerald-100 font-bold mt-0.5 font-sans">Delivered safe, fresh, and contact-free!</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDeliverySuccessBanner(null);
                  setTrackingOrderId(null);
                  setIsTrackingDrawerOpen(false);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black px-3.5 py-2 rounded-xl transition-all shadow-xs shrink-0 border border-emerald-500/20"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
