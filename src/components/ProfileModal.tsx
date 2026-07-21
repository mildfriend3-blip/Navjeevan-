import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from './AppContext';
import { 
  User, Phone, ShoppingBag, HelpCircle, Heart, Wallet, LogOut, 
  ChevronRight, ChevronDown, Plus, X, CheckCircle2, MapPin, 
  ArrowLeft, PhoneCall, MessageCircle, AlertCircle, Award, 
  RefreshCw, Gift, Sparkles, MessageSquare, Bell, Info, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Town, Order, Product } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    logoutUser, 
    orders, 
    cart, 
    addToCart, 
    products, 
    currentTown,
    flatDetails,
    selectedNeighborhood,
    updateUserProfile,
    updateWalletBalance
  } = useApp();

  // Navigation Panel State: 'main' | 'orders' | 'support' | 'wishlist' | 'addresses' | 'refunds' | 'rewards' | 'suggest' | 'notifications' | 'info'
  const [activePane, setActivePane] = useState<string>('main');

  // Edit profile and email details card states
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Sync edits when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Derived wallet balance from AppContext currentUser
  const walletBalance = currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250;
  
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('navjeevan_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addCashAmount, setAddCashAmount] = useState<string>('');
  const [showAddCashInput, setShowAddCashInput] = useState<boolean>(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [supportAccordion, setSupportAccordion] = useState<string | null>(null);
  const [suggestedProductText, setSuggestedProductText] = useState<string>('');
  const [suggestSuccess, setSuggestSuccess] = useState<boolean>(false);

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Persist wallet balance
  const handleAddWalletCash = (amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    const currentBal = currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 250;
    const newBalance = currentBal + amount;
    updateWalletBalance(newBalance);
    triggerToast(`₹${amount} added successfully to Navjeevan Cash! 🥳`);
    setAddCashAmount('');
    setShowAddCashInput(false);
  };

  // Toggle wishlist items
  const toggleWishlistItem = (id: string) => {
    let nextWishlist = [...wishlist];
    if (nextWishlist.includes(id)) {
      nextWishlist = nextWishlist.filter(item => item !== id);
      triggerToast('Removed item from your wishlist');
    } else {
      nextWishlist.push(id);
      triggerToast('Added item to your wishlist ❤️');
    }
    setWishlist(nextWishlist);
    localStorage.setItem('navjeevan_wishlist', JSON.stringify(nextWishlist));
  };

  // Filter orders belonging to the current customer
  const customerOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(o => o.customerPhone === currentUser.phone);
  }, [orders, currentUser]);

  // Expand / collapse order items details
  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Reorder items: instantly push items from past order to cart
  const handleReorder = (order: Order) => {
    let addedCount = 0;
    order.items.forEach(item => {
      // Find matching product in products catalog
      const matchedProd = products.find(p => p.id === item.productId);
      if (matchedProd) {
        // Push to cart. AppContext will manage incremental quantities
        for (let i = 0; i < item.quantity; i++) {
          addToCart(matchedProd, item.price);
        }
        addedCount++;
      }
    });

    if (addedCount > 0) {
      triggerToast(`Reordered ${addedCount} items. Pushed to your cart! 🛒`);
    } else {
      triggerToast(`Could not find these items in current store catalog.`);
    }
  };

  // Get Wishlist Products
  const wishlistProducts = useMemo(() => {
    return products.filter(p => wishlist.includes(p.id));
  }, [products, wishlist]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 30, opacity: 0 }}
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[85vh] relative"
        >
          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-4 right-4 bg-slate-900 text-white py-3 px-4 rounded-2xl shadow-xl z-50 flex items-center gap-2.5 text-xs font-bold border border-slate-800"
              >
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              {activePane !== 'main' && (
                <button
                  type="button"
                  onClick={() => setActivePane('main')}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors mr-1"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {activePane === 'main' && 'Profile & Account'}
                {activePane === 'orders' && 'Your Orders'}
                {activePane === 'support' && 'Help & Customer Support'}
                {activePane === 'wishlist' && 'Your Wishlist'}
                {activePane === 'addresses' && 'Saved Addresses'}
                {activePane === 'refunds' && 'Refunds History'}
                {activePane === 'rewards' && 'Navjeevan Rewards'}
                {activePane === 'suggest' && 'Suggest a Product'}
                {activePane === 'notifications' && 'Notifications'}
                {activePane === 'info' && 'General Info'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* 1. MAIN PANE */}
            {activePane === 'main' && (
              <>
                {/* Profile Header Block */}
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  <div className="h-14 w-14 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xl uppercase shadow-md shrink-0 border-2 border-white">
                    {currentUser?.name?.slice(0, 1) || 'U'}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h4 className="text-base font-black text-slate-800 tracking-tight truncate">{currentUser?.name || 'Customer'}</h4>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-1">
                      <Phone size={11} />
                      {currentUser?.phone || '+91 98765 43210'}
                    </span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-lg border border-emerald-200">
                    Active Session
                  </span>
                </div>

                {/* Edit Profile Details Card (Input and Save Full Name & Email Address) */}
                <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong className="block text-xs font-black text-slate-700">Edit Profile Details</strong>
                      <p className="text-[10px] text-slate-400 font-medium">Input your name and verified email address</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-3xs"
                    >
                      {isEditingProfile ? 'Cancel' : 'Edit Details'}
                    </button>
                  </div>

                  {!isEditingProfile ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-150 p-3 rounded-xl text-left">
                        <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider">Full Name</span>
                        <span className="text-xs font-black text-slate-700 block mt-1 truncate">{currentUser?.name || 'Not Set'}</span>
                      </div>
                      <div className="bg-white border border-slate-150 p-3 rounded-xl text-left">
                        <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider">Email Address</span>
                        <span className="text-xs font-black text-slate-700 block mt-1 truncate">{currentUser?.email || 'No email saved'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1 animate-fade-in text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Full Name</label>
                           <input
                             type="text"
                             value={editName}
                             onChange={(e) => setEditName(e.target.value)}
                             placeholder="Full Name"
                             className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-slate-800"
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Email Address</label>
                           <input
                             type="email"
                             value={editEmail}
                             onChange={(e) => setEditEmail(e.target.value)}
                             placeholder="name@example.com"
                             className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-slate-800"
                           />
                         </div>
                       </div>
                       <button
                         type="button"
                         onClick={() => {
                           if (!editName.trim()) {
                             triggerToast("Full Name cannot be empty.");
                             return;
                           }
                           updateUserProfile(editName, editEmail);
                           setIsEditingProfile(false);
                           triggerToast("Profile details updated successfully! 📝");
                         }}
                         className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-sm"
                       >
                         Save Profile Changes
                       </button>
                     </div>
                   )}
                 </div>

                {/* 3-Card Quick Action Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Your Orders */}
                  <button
                    onClick={() => setActivePane('orders')}
                    className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-emerald-200/50 hover:shadow-md transition-all group"
                  >
                    <div className="bg-emerald-500/10 text-emerald-600 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <ShoppingBag size={20} />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-700 mt-2 block leading-snug">Your Orders</span>
                  </button>

                  {/* Help & Support */}
                  <button
                    onClick={() => setActivePane('support')}
                    className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-emerald-200/50 hover:shadow-md transition-all group"
                  >
                    <div className="bg-indigo-500/10 text-indigo-600 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <HelpCircle size={20} />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-700 mt-2 block leading-snug">Help & Support</span>
                  </button>

                  {/* Your Wishlist */}
                  <button
                    onClick={() => setActivePane('wishlist')}
                    className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-emerald-200/50 hover:shadow-md transition-all group"
                  >
                    <div className="bg-red-500/10 text-red-600 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Heart size={20} className="fill-red-500/10 group-hover:fill-red-500" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-700 mt-2 block leading-snug">Your Wishlist</span>
                  </button>
                </div>

                {/* 2. Navjeevan Cash Wallet Banner */}
                <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 rounded-2.5xl p-5 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-[circle_at_right] from-white/10 to-transparent pointer-events-none" />
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Wallet size={16} className="text-purple-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-100 font-mono">Navjeevan Cash & Gift Card</span>
                      </div>
                      <h4 className="text-2xl font-black tracking-tight flex items-baseline">
                        ₹{walletBalance.toFixed(2)}
                        <span className="text-xs text-purple-200 font-medium ml-1.5">Available Balance</span>
                      </h4>
                    </div>

                    {!showAddCashInput ? (
                      <button
                        onClick={() => setShowAddCashInput(true)}
                        className="bg-white hover:bg-purple-50 text-indigo-700 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                      >
                        Add Balance
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAddCashInput(false)}
                        className="bg-black/20 hover:bg-black/30 text-white font-black text-xs p-1.5 rounded-full transition-all"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Add Cash Dropdown Input */}
                  <AnimatePresence>
                    {showAddCashInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/15 space-y-3 overflow-hidden"
                      >
                        <span className="block text-[10px] font-extrabold text-purple-200">Select pre-set or enter custom amount:</span>
                        <div className="flex gap-2">
                          {[100, 200, 500].map((val) => (
                            <button
                              key={val}
                              onClick={() => handleAddWalletCash(val)}
                              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 py-1.5 rounded-lg text-xs font-bold transition-all"
                            >
                              +₹{val}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Enter Custom Amount (₹)"
                            value={addCashAmount}
                            onChange={(e) => setAddCashAmount(e.target.value)}
                            className="flex-1 bg-white/15 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-bold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 text-white"
                          />
                          <button
                            onClick={() => handleAddWalletCash(parseFloat(addCashAmount))}
                            disabled={!addCashAmount || parseFloat(addCashAmount) <= 0}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-4.5 py-2 rounded-xl transition-all disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation Grouped Lists */}
                <div className="space-y-1">
                  <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 font-mono px-1">Account & Utilities</span>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-2.5xl overflow-hidden divide-y divide-slate-100">
                    
                    {/* Saved Addresses */}
                    <button
                      onClick={() => setActivePane('addresses')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-500"><MapPin size={16} /></div>
                        <div>
                          <strong className="block text-xs font-black text-slate-700">Saved Addresses</strong>
                          <span className="text-[10px] text-slate-400 font-medium">Verify your pinned GPS delivery spots</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    {/* Your Refunds */}
                    <button
                      onClick={() => setActivePane('refunds')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-500"><RefreshCw size={16} /></div>
                        <div>
                          <strong className="block text-xs font-black text-slate-700">Your Refunds</strong>
                          <span className="text-[10px] text-slate-400 font-medium">Track money from returned or missing items</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    {/* Rewards */}
                    <button
                      onClick={() => setActivePane('rewards')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-500"><Award size={16} /></div>
                        <div>
                          <strong className="block text-xs font-black text-slate-700">Rewards & Coupons</strong>
                          <span className="text-[10px] text-slate-400 font-medium">Unlock scratch cards and checkout benefits</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    {/* Suggest Products */}
                    <button
                      onClick={() => setActivePane('suggest')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-500"><Sparkles size={16} /></div>
                        <div>
                          <strong className="block text-xs font-black text-slate-700">Suggest Products</strong>
                          <span className="text-[10px] text-slate-400 font-medium">Tell us what you want in your local store hub</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    {/* Notifications */}
                    <button
                      onClick={() => setActivePane('notifications')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-500"><Bell size={16} /></div>
                        <div>
                          <strong className="block text-xs font-black text-slate-700">Notifications</strong>
                          <span className="text-[10px] text-slate-400 font-medium">Toggle alerts for orders and sales</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    {/* General Info */}
                    <button
                      onClick={() => setActivePane('info')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-500"><Info size={16} /></div>
                        <div>
                          <strong className="block text-xs font-black text-slate-700">General Info</strong>
                          <span className="text-[10px] text-slate-400 font-medium">Check terms, super shop licenses, and hours</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                  </div>
                </div>

                {/* Emergency Developer Utility */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="bg-amber-50/50 border border-amber-200/60 rounded-2.5xl p-4 space-y-2.5 text-left">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 text-amber-800 p-1.5 rounded-lg shrink-0">
                        <Sparkles size={14} className="fill-amber-800" />
                      </div>
                      <div>
                        <strong className="block text-xs font-black text-amber-950">Developer / Debug Options</strong>
                        <span className="text-[10px] text-amber-700/80 font-bold">Purge local cache and clean stale order entries</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('navjeevan_orders');
                        localStorage.removeItem('navjeevan_inventories');
                        window.location.reload();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <span>Clear Stale Orders & Reset</span>
                    </button>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      logoutUser();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-black text-sm rounded-2xl border border-red-100 transition-all shadow-2xs active:scale-[0.99]"
                  >
                    <LogOut size={16} />
                    <span>Log Out Account</span>
                  </button>
                </div>
              </>
            )}

            {/* 3. YOUR ORDERS PANE */}
            {activePane === 'orders' && (
              <div className="space-y-4">
                {customerOrders.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="bg-slate-100 text-slate-400 h-14 w-14 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <strong className="block text-sm font-black text-slate-700">No Orders Found Yet</strong>
                      <p className="text-xs text-slate-400 mt-1">Once you place quick orders, they will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {customerOrders.map((order) => {
                      const isExpanded = !!expandedOrders[order.id];
                      const totalItemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                      const orderDateString = new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      // Status styles
                      const isDelivered = order.status.toLowerCase() === 'delivered';
                      const isCancelled = order.status.toLowerCase() === 'cancelled';
                      const isTransit = ['dispatched', 'out-for-delivery', 'accepted', 'dispatched'].includes(order.status.toLowerCase());

                      let statusBg = 'bg-slate-100 text-slate-700 border-slate-200';
                      let statusText = order.status;
                      if (isDelivered) {
                        statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                        statusText = 'Delivered';
                      } else if (isCancelled) {
                        statusBg = 'bg-red-50 text-red-700 border-red-100';
                        statusText = 'Cancelled';
                      } else if (isTransit) {
                        statusBg = 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';
                        statusText = 'In Transit';
                      }

                      return (
                        <div key={order.id} className="border border-slate-100 rounded-2.5xl bg-slate-50/50 p-4 space-y-3 shadow-2xs">
                          {/* Order Brief Info */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wider font-black text-indigo-600 font-mono">{order.id}</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-800">{orderDateString}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md">{order.storeId} Hub</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${statusBg}`}>
                              {statusText}
                            </span>
                          </div>

                          {/* Quick Summary Line */}
                          <div className="flex justify-between items-center text-xs text-slate-600 bg-white border border-slate-100 px-3 py-2 rounded-xl">
                            <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} • Grand Total:</span>
                            <span className="font-black text-slate-800">₹{order.total}</span>
                          </div>

                          {/* Expandable itemized details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-white/60 border border-slate-100 rounded-xl p-3 space-y-2 text-xs"
                              >
                                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Item Details</span>
                                <div className="divide-y divide-slate-100/60 max-h-40 overflow-y-auto">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="py-1.5 flex justify-between gap-3 text-[11px]">
                                      <div className="min-w-0 flex-1">
                                        <span className="font-bold text-slate-800 truncate block">{item.name}</span>
                                        <span className="text-[10px] text-slate-400">{item.unit} • Qty: {item.quantity}</span>
                                      </div>
                                      <span className="font-extrabold text-slate-800">₹{item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Calculations summary */}
                                <div className="border-t border-slate-100 pt-2 text-[11px] space-y-1 text-slate-500">
                                  <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>₹{order.subtotal}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Delivery Fee</span>
                                    <span>₹{order.deliveryFee}</span>
                                  </div>
                                  {order.deliveryTip ? (
                                    <div className="flex justify-between">
                                      <span>Rider Tip</span>
                                      <span>₹{order.deliveryTip}</span>
                                    </div>
                                  ) : null}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-1 flex-wrap sm:flex-nowrap">
                            <button
                              onClick={() => toggleOrderExpand(order.id)}
                              className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] py-2 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Items'}</span>
                              <ChevronDown size={12} className={`transition-transform duration-250 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            <button
                              onClick={() => handleReorder(order)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1"
                            >
                              <RefreshCw size={11} className="animate-spin-slow" />
                              <span>Reorder Items</span>
                            </button>

                            <button
                              onClick={() => {
                                setActivePane('support');
                                setSupportAccordion('delivery_issues');
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] px-3 py-2 rounded-xl border border-indigo-100/50 transition-all flex items-center justify-center gap-1"
                              title="Need Help with this Order?"
                            >
                              <HelpCircle size={12} />
                              <span className="hidden sm:inline">Support</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. HELP & SUPPORT CENTER PANE */}
            {activePane === 'support' && (
              <div className="space-y-5">
                {/* Visual support assistance header */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2.5xl p-4 flex items-start gap-3">
                  <div className="bg-indigo-500 text-white p-3 rounded-2xl shrink-0 shadow-sm">
                    <HelpCircle size={20} />
                  </div>
                  <div className="space-y-1 text-left">
                    <strong className="block text-xs font-black text-slate-800 leading-normal">Welcome to Navjeevan 24x7 Helpdesk</strong>
                    <p className="text-[10px] text-slate-500 leading-normal">We commit to resolving delivery, quality, or payment queries in under 5 minutes.</p>
                  </div>
                </div>

                {/* Categorized help accordions */}
                <div className="space-y-2.5">
                  {[
                    {
                      id: 'delivery_issues',
                      title: 'Order & Delivery Issues',
                      content: 'Our typical delivery takes under 10 minutes from the matched regional store. If your rider has not arrived, or went in the wrong direction, you can check the Live GPS Navigator tracker in your orders history, or trigger an instant chat with our hub manager directly.'
                    },
                    {
                      id: 'refunds_wallet',
                      title: 'Refunds & Wallet Cash',
                      content: 'Refunds for cancelled orders or missing items are instantly credited to your Navjeevan Cash Wallet within 60 seconds. You can use your wallet balance during checkout on your next order, or top up balance anytime using standard UPI methods.'
                    },
                    {
                      id: 'address_changes',
                      title: 'Address Changes & GPS Pints',
                      content: 'To change your address, click the "Delivering To" selector button on the app header and drag the pin pointer over the maps interface. This dynamically updates and matches you with the nearest franchise store for ultra-fast delivery.'
                    },
                    {
                      id: 'product_quality',
                      title: 'Product Quality & Damaged Packets',
                      content: 'We source fresh fruits, vegetables, and dairy daily from localized cold stores. If you receive spoiled, broken or expired materials, raise a refund claim within 24 hours. We will credit your Navjeevan Cash wallet immediately, no questions asked.'
                    }
                  ].map((faq) => {
                    const isCurrentExpanded = supportAccordion === faq.id;
                    return (
                      <div key={faq.id} className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-2xs">
                        <button
                          onClick={() => setSupportAccordion(isCurrentExpanded ? null : faq.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-all font-black text-xs text-slate-800"
                        >
                          <span>{faq.title}</span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCurrentExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isCurrentExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-slate-50 border-t border-slate-100"
                            >
                              <p className="p-4 text-[11px] text-slate-600 leading-relaxed font-medium">
                                {faq.content}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Direct contact actions */}
                <div className="space-y-2">
                  <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 font-mono px-1">Connect Directly</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Call Customer Care */}
                    <a
                      href="tel:+919422212345"
                      onClick={(e) => {
                        e.preventDefault();
                        triggerToast("Dialing customer care support desk... 📞");
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-2xl border border-slate-200 transition-all shadow-2xs"
                    >
                      <PhoneCall size={14} className="text-emerald-600 animate-bounce" />
                      <span>Call Support</span>
                    </a>

                    {/* Chat on WhatsApp */}
                    <a
                      href="https://wa.me/919422212345"
                      onClick={(e) => {
                        e.preventDefault();
                        triggerToast("Opening customer assistance WhatsApp channel... 💬");
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-2xl border border-slate-200 transition-all shadow-2xs"
                    >
                      <MessageCircle size={14} className="text-emerald-500 fill-emerald-50" />
                      <span>Chat WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 5. WISHLIST PANE */}
            {activePane === 'wishlist' && (
              <div className="space-y-4">
                {wishlistProducts.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="bg-slate-100 text-slate-400 h-14 w-14 rounded-full flex items-center justify-center mx-auto">
                      <Heart size={24} />
                    </div>
                    <div>
                      <strong className="block text-sm font-black text-slate-700">Your Wishlist is Empty</strong>
                      <p className="text-xs text-slate-400 mt-1">Tap hearts on products in the store to save them here for quick buying!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 font-mono px-1">Saved Favorites ({wishlistProducts.length})</span>
                    
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2.5xl bg-slate-50/50 overflow-hidden">
                      {wishlistProducts.map((prod) => (
                        <div key={prod.id} className="p-3 bg-white flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Product Dummy representation */}
                            <div className="h-11 w-11 rounded-xl shrink-0 flex items-center justify-center text-lg shadow-inner" style={{ background: prod.imageColor || '#f1f5f9' }}>
                              🥦
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <strong className="block text-xs font-black text-slate-800 truncate leading-tight">{prod.name}</strong>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{prod.unit} • ₹{prod.price}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                addToCart(prod, prod.price);
                                triggerToast(`Added ${prod.name} to cart! 🛒`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
                            >
                              Add to Bag
                            </button>
                            <button
                              onClick={() => toggleWishlistItem(prod.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-red-500 hover:text-red-600 transition-colors"
                              title="Remove from favorites"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. SAVED ADDRESSES PANE */}
            {activePane === 'addresses' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2.5xl p-4.5 space-y-3 text-left">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <MapPin size={18} />
                    <strong className="text-xs font-black">Active Delivery Address</strong>
                  </div>
                  
                  <div className="space-y-1.5 pl-7">
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-black font-mono">CURRENT MATCH</span>
                    <p className="text-xs font-black text-slate-800 leading-relaxed">
                      {flatDetails || 'Apartment 204, Block-B, near landmark'}, {selectedNeighborhood || 'Main Colony'}, {currentTown}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Auto-assigned store: <span className="text-indigo-600 font-black">{currentTown} Franchise Store Hub</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2.5xl p-4 text-center text-xs space-y-2">
                  <p className="text-slate-500 leading-relaxed">Need to deliver somewhere else? Tap the delivery pill in the header to select a neighborhood or drop a GPS pin on the map!</p>
                </div>
              </div>
            )}

            {/* 7. REFUNDS PANE */}
            {activePane === 'refunds' && (
              <div className="space-y-4 text-center py-6">
                <div className="bg-indigo-50 text-indigo-600 h-14 w-14 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <RefreshCw size={24} className="animate-spin-slow" />
                </div>
                <div className="space-y-1.5">
                  <strong className="text-sm font-black text-slate-800 block">No Active Refunds</strong>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">All of your previous refunds have been completed and fully credited to your Navjeevan Cash wallet.</p>
                </div>
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 text-[10px] text-slate-500 font-bold max-w-xs mx-auto">
                  Instant refunds processed: 0 · Pending: 0
                </div>
              </div>
            )}

            {/* 8. REWARDS PANE */}
            {activePane === 'rewards' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-2.5xl p-5 text-slate-950 shadow-md text-left relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-[circle_at_right] from-white/20 to-transparent pointer-events-none" />
                  <Gift className="h-10 w-10 text-white/90 stroke-[1.5] absolute right-4 top-4" />
                  
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-black font-mono tracking-widest text-slate-900 bg-white/40 px-1.5 py-0.5 rounded-md">Scratch Cards</span>
                    <h4 className="text-lg font-black tracking-tight mt-1.5">Navjeevan Super Club</h4>
                    <p className="text-[10px] text-slate-900 font-bold leading-normal">Place 2 more orders this week to unlock a guaranteed ₹50 coupon card!</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-left">
                  <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 font-mono px-1">Available Coupons</span>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-2.5xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <strong className="block text-xs font-black text-slate-700">FREE_DELIVERY</strong>
                      <span className="text-[10px] text-slate-400 font-medium">Free delivery on orders above ₹149</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-emerald-200">ACTIVE ON STORE</span>
                  </div>
                </div>
              </div>
            )}

            {/* 9. SUGGEST PRODUCTS PANE */}
            {activePane === 'suggest' && (
              <div className="space-y-4 text-left">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2.5xl p-4.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <Sparkles size={16} />
                    <strong className="text-xs font-black">Want something else?</strong>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">Tell us what brand, grocery packet or fruit variety you want! Our logistics managers will source it and list it in your regional store within 48 hours.</p>
                </div>

                {!suggestSuccess ? (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Describe the product(s) or brands</label>
                    <textarea
                      placeholder="e.g. Saffola Active Olive Oil 1 Litre, or organic baby spinach packets..."
                      value={suggestedProductText}
                      onChange={(e) => setSuggestedProductText(e.target.value)}
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-slate-50 font-bold text-slate-800"
                    />
                    <button
                      onClick={() => {
                        if (suggestedProductText.trim()) {
                          setSuggestSuccess(true);
                          triggerToast("Product suggestion sent to logistics desk! 🚀");
                        }
                      }}
                      disabled={!suggestedProductText.trim()}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-45"
                    >
                      Submit Suggestion
                    </button>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-3 bg-slate-50 border border-slate-100 rounded-2.5xl">
                    <div className="bg-emerald-100 text-emerald-600 h-10 w-10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <strong className="block text-xs font-black text-slate-700">Thank you!</strong>
                      <p className="text-[10px] text-slate-400 mt-1">Our procurement department has been notified.</p>
                    </div>
                    <button
                      onClick={() => {
                        setSuggestedProductText('');
                        setSuggestSuccess(false);
                      }}
                      className="text-[10px] text-indigo-600 font-extrabold hover:underline"
                    >
                      Suggest another product
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 10. NOTIFICATIONS PANE */}
            {activePane === 'notifications' && (
              <div className="space-y-3.5 text-left">
                <div className="bg-slate-50 border border-slate-100 rounded-2.5xl p-4 flex gap-3.5">
                  <div className="bg-emerald-500 text-white p-2 h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
                    <Bell size={14} />
                  </div>
                  <div>
                    <strong className="block text-xs font-black text-slate-700">Welcome offer active!</strong>
                    <p className="text-[10px] text-slate-400 mt-0.5">Use wallet credit or cash cards for free deliveries on all fruits and veg.</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-2 block">10 minutes ago</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2.5xl p-4 flex gap-3.5 opacity-60">
                  <div className="bg-indigo-500 text-white p-2 h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
                    <ShoppingBag size={14} />
                  </div>
                  <div>
                    <strong className="block text-xs font-black text-slate-700">Assigned nearest store hub</strong>
                    <p className="text-[10px] text-slate-400 mt-0.5">Your delivery has been mapped to {currentTown} Super Shop.</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-2 block">1 hour ago</span>
                  </div>
                </div>
              </div>
            )}

            {/* 11. GENERAL INFO PANE */}
            {activePane === 'info' && (
              <div className="space-y-4 text-left text-xs text-slate-600 leading-relaxed font-medium">
                <div className="bg-slate-50 border border-slate-100 rounded-2.5xl p-4 space-y-3">
                  <div>
                    <strong className="block text-xs font-black text-slate-800">Operational Hours</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Daily: 6:00 AM - 11:00 PM (Quick Dispatch)</p>
                  </div>
                  <hr className="border-slate-200" />
                  <div>
                    <strong className="block text-xs font-black text-slate-800">Franchise Terms & Policies</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">All local pricing, inventory availability and store hours are directly managed by verified regional franchise license owners.</p>
                  </div>
                  <hr className="border-slate-200" />
                  <div>
                    <strong className="block text-xs font-black text-slate-800">Support Desk</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Navjeevan Super Shop is licensed under FSSAI and local municipal commerce guidelines. Support hotline: support@navjeevan.plus</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer (Always close or logout) */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 text-center">
            <span className="text-[10px] text-slate-400 font-bold">Navjeevan Plus Dashboard · Version 2.4.0</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
