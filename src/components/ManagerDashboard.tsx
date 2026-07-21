import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from './AppContext';
import { FRANCHISE_STORES, INITIAL_PRODUCTS } from '../data/initialData';
import { Town, OrderStatus, Product } from '../types';
import { ProductIcon } from './ProductIcon';
import { 
  Building2, TrendingUp, AlertTriangle, Eye, CheckCircle2, 
  Truck, ArrowRight, XCircle, Search, SlidersHorizontal, Edit2, Check, RefreshCw 
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const {
    inventories,
    orders,
    currentTown,
    setCurrentTown,
    updateOrderStatus,
    updateInventoryStock,
    updateInventoryPrice,
  } = useApp();

  const [selectedTown, setSelectedTown] = useState<Town>(currentTown);

  // Sync selectedTown if currentTown changes from header
  useEffect(() => {
    setSelectedTown(currentTown);
  }, [currentTown]);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  
  // Inventory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Stock Editing helper state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);

  // Active Store details
  const activeStore = useMemo(() => {
    return FRANCHISE_STORES.find(s => s.id === selectedTown) || FRANCHISE_STORES[0];
  }, [selectedTown]);

  // Store Inventory
  const storeInventory = useMemo(() => {
    return inventories[selectedTown] || {};
  }, [inventories, selectedTown]);

  // Store Orders
  const storeOrders = useMemo(() => {
    return orders.filter(order => order.storeId === selectedTown);
  }, [orders, selectedTown]);

  // Store Stats Calculations
  const stats = useMemo(() => {
    let grossSales = 0;
    let activeCount = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    // Gross Sales are completed orders, or overall orders in system
    storeOrders.forEach(o => {
      if (o.status !== 'cancelled') {
        grossSales += o.subtotal;
      }
      if (['placed', 'preparing', 'out-for-delivery'].includes(o.status)) {
        activeCount += 1;
      }
    });

    // Inventory status
    Object.keys(storeInventory).forEach(pId => {
      const item = storeInventory[pId];
      if (item.stock === 0) {
        outOfStockCount += 1;
      } else if (item.stock <= 4) {
        lowStockCount += 1;
      }
    });

    return { grossSales, activeCount, outOfStockCount, lowStockCount };
  }, [storeOrders, storeInventory]);

  // Filtered inventory list
  const filteredInventoryItems = useMemo(() => {
    return INITIAL_PRODUCTS.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const startEditing = (product: Product, currentStock: number, currentPrice: number) => {
    setEditingProductId(product.id);
    setEditStockValue(currentStock);
    setEditPriceValue(currentPrice);
  };

  const saveInventoryEdits = (productId: string) => {
    updateInventoryStock(selectedTown, productId, editStockValue);
    updateInventoryPrice(selectedTown, productId, editPriceValue);
    setEditingProductId(null);
  };

  // Helper lists
  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'fruits-veg', label: 'Fruits & Veg' },
    { id: 'dairy-bakery', label: 'Dairy & Bakery' },
    { id: 'grocery', label: 'Grocery' },
    { id: 'snacks-beverages', label: 'Snacks & Drinks' },
    { id: 'personal-care', label: 'Personal Care' },
    { id: 'household', label: 'Household' },
  ];

  return (
    <div className="py-6 space-y-6">
      
      {/* Franchise Selector Tabs */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-slate-900 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl text-slate-900 shadow-md">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">Franchise Control Board</h1>
            <p className="text-xs text-slate-400">Select branch location to manage inventory, pricing, and orders</p>
          </div>
        </div>

        {/* Town select buttons */}
        <div className="flex flex-wrap gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
          {FRANCHISE_STORES.map((store) => (
            <button
              key={store.id}
              id={`franchise-tab-${store.id}`}
              onClick={() => {
                setSelectedTown(store.id);
                setCurrentTown(store.id);
                setEditingProductId(null); // Clear editing state
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedTown === store.id
                  ? 'bg-amber-500 text-slate-900 shadow-sm scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {store.id} Store
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Gross Store Sales</span>
            <span className="text-2xl font-black text-slate-800 block mt-1 font-mono">₹{stats.grossSales}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">✓ Online & Safe</span>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Active Order Queue */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Pending Fulfilments</span>
            <span className="text-2xl font-black text-amber-500 block mt-1 font-mono">{stats.activeCount}</span>
            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Need instant packing</span>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-500">
            <Truck size={20} className="animate-bounce" />
          </div>
        </div>

        {/* Out of Stock Alert */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Sold Out Products</span>
            <span className={`text-2xl font-black block mt-1 font-mono ${stats.outOfStockCount > 0 ? 'text-red-500' : 'text-slate-700'}`}>
              {stats.outOfStockCount}
            </span>
            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Requires restock</span>
          </div>
          <div className={`p-2.5 rounded-2xl ${stats.outOfStockCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
            <XCircle size={20} />
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Low Stock Warning</span>
            <span className={`text-2xl font-black block mt-1 font-mono ${stats.lowStockCount > 0 ? 'text-amber-500 font-extrabold' : 'text-slate-700'}`}>
              {stats.lowStockCount}
            </span>
            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Stock level &lt; 5 items</span>
          </div>
          <div className={`p-2.5 rounded-2xl ${stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Primary Workspace Panels */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
        
        {/* Workspace Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2">
          <button
            id="workspace-tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'orders'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            📋 Order Fulfillment Queue ({storeOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length})
          </button>
          <button
            id="workspace-tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            🗃️ Local Stock & Price Config ({INITIAL_PRODUCTS.length})
          </button>
        </div>

        {/* WORKSPACE: ORDER PIPELINE */}
        {activeTab === 'orders' && (
          <div className="p-6">
            {storeOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No orders have been placed in {selectedTown} yet.</p>
                <p className="text-xs text-slate-400 mt-1">Switch to "Shop Mode" to place test orders!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {storeOrders.map((order) => {
                  
                  // Rider allocation list
                  const sampleRiders = [
                    { name: 'Vijay Rathod', phone: '+91 95456 12000' },
                    { name: 'Kunal Patil', phone: '+91 88765 44123' },
                    { name: 'Sanjay More', phone: '+91 93222 55999' }
                  ];

                  const assignRiderAndDispatch = () => {
                    const randomRider = sampleRiders[Math.floor(Math.random() * sampleRiders.length)];
                    updateOrderStatus(order.id, 'out-for-delivery', randomRider.name, randomRider.phone);
                  };

                  return (
                    <div
                      key={order.id}
                      id={`mngr-order-card-${order.id}`}
                      className={`border rounded-2xl p-4.5 transition-all ${
                        order.status === 'placed'
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : order.status === 'preparing'
                          ? 'border-amber-200 bg-amber-50/25'
                          : order.status === 'out-for-delivery'
                          ? 'border-blue-100 bg-blue-50/10'
                          : 'border-slate-100 bg-white opacity-85'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pb-4 border-b border-dashed border-slate-200">
                        {/* Order Identity & Customer Info */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-slate-800">{order.id}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              order.status === 'placed'
                                ? 'bg-emerald-600 text-white'
                                : order.status === 'preparing'
                                ? 'bg-amber-400 text-slate-900 font-bold'
                                : order.status === 'out-for-delivery'
                                ? 'bg-blue-600 text-white'
                                : order.status === 'delivered'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-red-50 text-red-600'
                            }`}>
                              {order.status === 'placed' ? 'New Placed' : order.status === 'preparing' ? 'Packing' : order.status === 'out-for-delivery' ? 'Dispatched' : order.status}
                            </span>
                          </div>
                          
                          <div className="text-xs text-slate-600 space-y-0.5">
                            <p className="font-bold text-slate-800">Cust: {order.customerName} ({order.customerPhone})</p>
                            <p className="text-slate-500">Address: {order.customerAddress}</p>
                          </div>
                        </div>

                        {/* Order Financials & Action Controls */}
                        <div className="flex flex-col md:items-end gap-2 self-start md:self-auto">
                          <span className="text-sm text-slate-500 font-semibold font-mono">
                            Subtotal: <span className="text-slate-800 font-extrabold">₹{order.subtotal}</span>
                          </span>

                          <div className="flex flex-wrap gap-2">
                            {/* CANCEL */}
                            {['placed', 'preparing'].includes(order.status) && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all"
                              >
                                Cancel Fulfilment
                              </button>
                            )}

                            {/* PLACED -> PREPARING */}
                            {order.status === 'placed' && (
                              <button
                                id={`mngr-btn-prepare-${order.id}`}
                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                              >
                                Accept & Start Packing <ArrowRight size={12} />
                              </button>
                            )}

                            {/* PREPARING -> DISPATCH (Out-for-delivery) */}
                            {order.status === 'preparing' && (
                              <button
                                id={`mngr-btn-dispatch-${order.id}`}
                                onClick={assignRiderAndDispatch}
                                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-extrabold shadow-xs transition-all flex items-center gap-1"
                              >
                                Handover to Rider <Truck size={12} />
                              </button>
                            )}

                            {/* DISPATCH -> DELIVERED */}
                            {order.status === 'out-for-delivery' && (
                              <button
                                id={`mngr-btn-deliver-${order.id}`}
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-950 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                              >
                                Mark Delivered ✓
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order Items Summary */}
                      <div className="pt-3 flex flex-wrap gap-x-6 gap-y-2.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-xs">
                            <span className="font-mono bg-slate-100 font-black px-1.5 py-0.5 rounded-md text-slate-700">
                              {item.quantity}x
                            </span>
                            <span className="font-bold text-slate-800">{item.name}</span>
                            <span className="text-slate-400">({item.unit})</span>
                          </div>
                        ))}
                      </div>

                      {/* Display Rider Assigned status */}
                      {order.riderName && (
                        <div className="mt-3 bg-slate-100 p-2.5 rounded-xl flex justify-between items-center text-xs text-slate-600 font-medium">
                          <span>🛵 Assigned Rider: <strong className="text-slate-800">{order.riderName}</strong></span>
                          <span>Call: {order.riderPhone}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE: STOCK & PRICING CONFIG */}
        {activeTab === 'inventory' && (
          <div className="p-6 space-y-4">
            
            {/* Table filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Category selector */}
              <select
                id="inv-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              {/* Text Search */}
              <div className="relative flex-grow flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3">
                <Search size={14} className="text-slate-400 mr-2" />
                <input
                  id="inv-search-input"
                  type="text"
                  placeholder="Search inventory items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Inventory Table list */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Price (₹)</th>
                    <th className="p-3 text-right">Stock Level</th>
                    <th className="p-3 text-center">Action Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredInventoryItems.map((prod) => {
                    const localData = storeInventory[prod.id] || { price: prod.price, stock: 20, isAvailable: true };
                    const isEditing = editingProductId === prod.id;
                    const isOutOfStock = localData.stock === 0;
                    const isLowStock = localData.stock > 0 && localData.stock <= 4;

                    return (
                      <tr 
                        key={prod.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isOutOfStock ? 'bg-red-50/15' : isLowStock ? 'bg-amber-50/10' : ''
                        }`}
                      >
                        {/* Name & Icon */}
                        <td className="p-3">
                          <div className="flex items-center space-x-2.5">
                            <div 
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                              style={{ background: prod.imageColor }}
                            >
                              <ProductIcon name={prod.icon} size={13} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 leading-none">{prod.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{prod.unit}</p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {prod.category.replace('-', ' ')}
                          </span>
                        </td>

                        {/* Price Column */}
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end">
                              <span className="text-slate-400 mr-1">₹</span>
                              <input
                                id={`edit-price-input-${prod.id}`}
                                type="number"
                                min="1"
                                value={editPriceValue}
                                onChange={(e) => setEditPriceValue(Number(e.target.value))}
                                className="w-16 border border-slate-300 rounded-md py-1 px-1.5 text-right font-mono text-xs focus:outline-none"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-slate-900 font-bold">₹{localData.price}</span>
                          )}
                        </td>

                        {/* Stock Column */}
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <input
                              id={`edit-stock-input-${prod.id}`}
                              type="number"
                              min="0"
                              value={editStockValue}
                              onChange={(e) => setEditStockValue(Number(e.target.value))}
                              className="w-16 border border-slate-300 rounded-md py-1 px-1.5 text-right font-mono text-xs focus:outline-none"
                            />
                          ) : (
                            <div className="flex items-center justify-end space-x-1.5">
                              {isOutOfStock ? (
                                <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm">Sold Out</span>
                              ) : isLowStock ? (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm">Low Stock</span>
                              ) : null}
                              <span className={`font-mono font-black ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-slate-800'}`}>
                                {localData.stock} units
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Editing Actions */}
                        <td className="p-3 text-center">
                          {isEditing ? (
                            <div className="flex justify-center space-x-1">
                              <button
                                id={`save-inv-btn-${prod.id}`}
                                onClick={() => saveInventoryEdits(prod.id)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                title="Save modifications"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                                title="Discard"
                              >
                                <SlidersHorizontal size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center gap-1.5">
                              {/* Inline Quick Edit Button */}
                              <button
                                id={`edit-inv-btn-${prod.id}`}
                                onClick={() => startEditing(prod, localData.stock, localData.price)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                title="Configure Stock & Pricing"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Quick +10 stock adder */}
                              <button
                                id={`quick-restock-btn-${prod.id}`}
                                onClick={() => updateInventoryStock(selectedTown, prod.id, localData.stock + 10)}
                                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 py-1 rounded-lg transition-all"
                                title="Quickly add 10 units of inventory stock"
                              >
                                +10 Stock
                              </button>

                              {/* Quick 0 stock out-of-stocker */}
                              {!isOutOfStock && (
                                <button
                                  id={`quick-out-btn-${prod.id}`}
                                  onClick={() => updateInventoryStock(selectedTown, prod.id, 0)}
                                  className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2 py-1 rounded-lg transition-all"
                                  title="Instantly mark item as Sold Out"
                                >
                                  Mark Out
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
