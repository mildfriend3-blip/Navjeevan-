import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { INITIAL_PRODUCTS, FRANCHISE_STORES } from '../data/initialData';
import { ProductIcon } from './ProductIcon';
import { Category, Town, Order } from '../types';
import { 
  Search, ShoppingCart, Plus, Minus, MapPin, Clock, ArrowRight, CheckCircle2, 
  Trash2, Phone, Sparkles, AlertCircle, ShoppingBag, X, Check, Eye,
  ArrowLeft, ShieldCheck, Ticket, CreditCard, Wallet, Percent
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
    inventories,
    cart,
    addToCart,
    updateCartQuantity,
    clearCart,
    placeOrder,
    orders,
    updateOrderStatus
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [addressDetails, setAddressDetails] = useState('Apartment 204, Block-B, near landmark');
  const [paymentMethod, setPaymentMethod] = useState<'gpay' | 'phonepe' | 'upi'>('gpay');
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

  // Sync selectedNeighborhood when town changes
  React.useEffect(() => {
    const list = NEIGHBORHOODS[currentTown] || [];
    if (list.length > 0) {
      setSelectedNeighborhood(list[0]);
    }
  }, [currentTown]);

  // Update compiled address when details or neighborhood changes
  React.useEffect(() => {
    const neighbor = selectedNeighborhood || 'Main Colony';
    const compiled = `${addressDetails ? addressDetails + ', ' : ''}${neighbor}, ${currentTown}`;
    setCustomerAddress(compiled);
  }, [selectedNeighborhood, addressDetails, currentTown]);

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

  // Active customer orders for live tracking
  const customerOrders = useMemo(() => {
    return orders.filter(o => o.storeId === currentTown);
  }, [orders, currentTown]);

  const activeTrackingOrder = useMemo(() => {
    if (trackingOrderId) {
      return orders.find(o => o.id === trackingOrderId);
    }
    // Default to the most recent incomplete order if there is one
    const incomplete = customerOrders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
    if (incomplete) return incomplete;
    // Otherwise fallback to most recent placed
    return customerOrders[0] || null;
  }, [orders, customerOrders, trackingOrderId]);

  const categories: { id: Category | 'all'; label: string; emoji: string; color: string }[] = [
    { id: 'all', label: 'All Items', emoji: '🏬', color: 'from-slate-600 to-slate-800' },
    { id: 'fruits-veg', label: 'Fruits & Veg', emoji: '🥭', color: 'from-orange-500 to-amber-500' },
    { id: 'dairy-bakery', label: 'Dairy & Eggs', emoji: '🥛', color: 'from-blue-500 to-indigo-500' },
    { id: 'grocery', label: 'Grocery Staples', emoji: '🌾', color: 'from-yellow-500 to-amber-600' },
    { id: 'snacks-beverages', label: 'Snacks & Drinks', emoji: '🍪', color: 'from-red-400 to-pink-500' },
    { id: 'personal-care', label: 'Personal Care', emoji: '🧴', color: 'from-teal-400 to-emerald-500' },
    { id: 'household', label: 'Household', emoji: '🧼', color: 'from-purple-400 to-indigo-500' },
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

    setCheckoutError('');
    const placed = placeOrder(customerName, customerAddress, customerPhone);
    if (placed) {
      setJustPlacedOrder(placed);
      setTrackingOrderId(placed.id);
      setShowOrderSuccess(true);
      setIsCartOpen(false);
      setIsCheckingOut(false);
      setAddressDetails('Apartment 204, Block-B, near landmark');
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
                    value={addressDetails}
                    onChange={(e) => setAddressDetails(e.target.value)}
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

                <div className="grid grid-cols-3 gap-3">
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
                </div>

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
                      <span>Franchise Packing Fee</span>
                      <span>₹5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>10-Min Delivery Charge</span>
                      <span>
                        {deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee}`}
                      </span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Promo Discount</span>
                        <span>-₹{appliedDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 text-xs font-black text-slate-800">
                      <span>Grand Total</span>
                      <span className="text-emerald-700 text-sm font-black">₹{Math.max(0, cartSubtotal + deliveryFee + 5 - appliedDiscount)}</span>
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
                  Pay ₹{Math.max(0, cartSubtotal + deliveryFee + 5 - appliedDiscount)} & Place Order <ArrowRight size={16} />
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
            <div className="lg:col-span-8 space-y-6">
              {/* Categories Horizontal Selector */}
              <div className="flex gap-2.5 overflow-x-auto pb-3.5 scrollbar-none">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <motion.button
                      key={cat.id}
                      id={`cat-btn-${cat.id}`}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all border ${
                        isActive
                          ? 'bg-slate-900 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.35)]'
                          : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50/80 hover:border-emerald-500/50'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm bg-gradient-to-br ${cat.color} text-white shadow-xs`}>
                        {cat.emoji}
                      </span>
                      <span>{cat.label}</span>
                    </motion.button>
                  );
                })}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

            {/* Right side panel (Cart & Live Tracking) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Cart Panel */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 sticky top-24">
                
                {/* Quick Header toggler */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <ShoppingCart size={18} className="text-emerald-600" /> My Cart
                  </h2>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                      <ShoppingCart size={20} />
                    </div>
                    <p className="text-slate-500 text-xs font-medium">Your shopping bag is empty.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Select products to pack in your 10-minute order!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cart list */}
                    <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex justify-between items-center text-sm gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px]"
                              style={{ background: item.product.imageColor }}
                            >
                              <ProductIcon name={item.product.icon} size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate text-xs">{item.product.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{item.product.unit} · ₹{item.localPrice}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black text-slate-700 font-mono">₹{item.localPrice * item.quantity}</span>
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden scale-90">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="px-1.5 text-[11px] font-bold font-mono">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  const storeItemStock = storeInventory[item.product.id]?.stock || 0;
                                  if (item.quantity >= storeItemStock) {
                                    alert(`Only ${storeItemStock} units available.`);
                                    return;
                                  }
                                  updateCartQuantity(item.product.id, item.quantity + 1);
                                }}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dynamic Animating Gradient Progress Bar for FREE Delivery */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-orange-500 animate-pulse" />
                          {cartSubtotal >= 200 ? (
                            <span className="text-emerald-700 font-black">🎉 FREE Delivery Unlocked!</span>
                          ) : (
                            <span className="text-slate-600 font-bold">
                              Add <span className="text-orange-500 font-black">₹{200 - cartSubtotal}</span> more for Free Delivery!
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[10px] font-black text-slate-400">
                          {Math.min(100, Math.round((cartSubtotal / 200) * 100))}%
                        </span>
                      </div>
                      
                      {/* The progress bar track */}
                      <div className="relative w-full h-3.5 bg-slate-200/70 rounded-full overflow-hidden p-[2px] border border-slate-300/30">
                        {/* Animating gradient bar filling up */}
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: `${Math.min(100, (cartSubtotal / 200) * 100)}%` }}
                          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 relative overflow-hidden"
                        >
                          {/* Light shimmer overlay scanning across */}
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0)_100%)] animate-shimmer-fast" style={{ backgroundSize: '200% 100%' }} />
                        </motion.div>
                      </div>
                      
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 px-0.5">
                        <span>₹0</span>
                        <span>Free 10-Min Delivery Goal (₹200)</span>
                      </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs font-medium text-slate-600 border border-slate-200/50">
                      <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span className="font-mono text-slate-800 font-bold">₹{cartSubtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quick Delivery Fee</span>
                        <span className="font-mono text-slate-800 font-bold">
                          {deliveryFee === 0 ? <span className="text-emerald-600 font-extrabold">FREE</span> : `₹${deliveryFee}`}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200/80 text-sm font-black text-slate-800">
                        <span>Grand Total</span>
                        <span className="font-mono text-emerald-600 text-lg drop-shadow-[0_0_6px_rgba(16,185,129,0.2)]">₹{cartTotal}</span>
                      </div>
                    </div>

                    {/* Proceed to Checkout CTA */}
                    <div className="pt-1">
                      {cartSubtotal < activeStore.minOrderValue ? (
                        <div className="text-center bg-amber-50 border border-amber-100 rounded-2xl p-3.5 text-xs font-bold text-amber-800 shadow-inner">
                          Min. Order value for {currentTown} store is ₹{activeStore.minOrderValue}. Please add ₹{activeStore.minOrderValue - cartSubtotal} more.
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          id="go-to-checkout-btn"
                          onClick={() => setIsCheckingOut(true)}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-sm py-4 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-1.5 border border-orange-400/40"
                        >
                          Proceed to Checkout <ArrowRight size={14} className="stroke-[3]" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Tracker Panel */}
              {activeTrackingOrder ? (
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
                  <div className="space-y-4 py-2 border-y border-slate-800">
                    {/* Step 1: Placed */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          ['placed', 'preparing', 'out-for-delivery', 'delivered'].includes(activeTrackingOrder.status)
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {['placed', 'preparing', 'out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? <Check size={12} /> : '1'}
                        </div>
                        <div className={`w-0.5 h-6 ${
                          ['preparing', 'out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? 'bg-emerald-500' : 'bg-slate-800'
                        }`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${['placed', 'preparing', 'out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? 'text-white' : 'text-slate-500'}`}>
                          Order Placed
                        </p>
                        <p className="text-[10px] text-slate-400">Navjeevan Plus has accepted your request</p>
                      </div>
                    </div>

                    {/* Step 2: Preparing */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          ['preparing', 'out-for-delivery', 'delivered'].includes(activeTrackingOrder.status)
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {['preparing', 'out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? <Check size={12} /> : '2'}
                        </div>
                        <div className={`w-0.5 h-6 ${
                          ['out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? 'bg-emerald-500' : 'bg-slate-800'
                        }`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${['preparing', 'out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? 'text-white' : 'text-slate-500'}`}>
                          Packing & Preparing
                        </p>
                        <p className="text-[10px] text-slate-400">Store agents are picking fresh items</p>
                      </div>
                    </div>

                    {/* Step 3: Out for Delivery */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          ['out-for-delivery', 'delivered'].includes(activeTrackingOrder.status)
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {['out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? <Check size={12} /> : '3'}
                        </div>
                        <div className={`w-0.5 h-6 ${
                          ['delivered'].includes(activeTrackingOrder.status) ? 'bg-emerald-500' : 'bg-slate-800'
                        }`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${['out-for-delivery', 'delivered'].includes(activeTrackingOrder.status) ? 'text-white' : 'text-slate-500'}`}>
                          Out for Delivery (Dispatched)
                        </p>
                        <p className="text-[10px] text-slate-400">Rider is speeding towards your door</p>
                      </div>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800 text-slate-400"
                        style={{
                          backgroundColor: activeTrackingOrder.status === 'delivered' ? '#10b981' : undefined,
                          color: activeTrackingOrder.status === 'delivered' ? '#022c22' : undefined
                        }}
                      >
                        {activeTrackingOrder.status === 'delivered' ? <CheckCircle2 size={13} /> : '4'}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${activeTrackingOrder.status === 'delivered' ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}`}>
                          Handed Over (Delivered)
                        </p>
                        <p className="text-[10px] text-slate-400">Order delivered! Enjoy your fresh items.</p>
                      </div>
                    </div>
                  </div>

                  {/* Countdown or Status Info */}
                  {activeTrackingOrder.status === 'delivered' ? (
                    <div className="bg-emerald-950 border border-emerald-900 rounded-2xl p-3 text-center">
                      <p className="text-xs font-bold text-emerald-400">Delivered Successfully! 🎉</p>
                      <p className="text-[10px] text-emerald-200/80 mt-0.5">Rate your experience with Navjeevan Plus.</p>
                    </div>
                  ) : activeTrackingOrder.status === 'cancelled' ? (
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
              ) : null}

            </div>
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

    </div>
  );
};
