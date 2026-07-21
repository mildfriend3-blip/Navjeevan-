import React from 'react';
import { useApp } from './AppContext';
import { ShoppingBag, LayoutDashboard, Truck, MapPin, RefreshCw, Sparkles } from 'lucide-react';
import { FRANCHISE_STORES } from '../data/initialData';
import { Town } from '../types';

export const Header: React.FC = () => {
  const { activeRole, setActiveRole, currentTown, setCurrentTown, resetAllData } = useApp();

  const handleTownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentTown(e.target.value as Town);
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-md shadow-emerald-200 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="font-extrabold text-xl tracking-tight text-slate-800">Navjeevan</span>
                <span className="font-black text-xl text-emerald-600 ml-1">Plus</span>
                <span className="ml-2 bg-amber-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide flex items-center">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5 animate-pulse" /> Super Shop
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono tracking-widest uppercase block -mt-1">Quick Commerce 10-Min Delivery</span>
            </div>
          </div>

          {/* Location Matcher (Only visible in Customer role, or as status in others) */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <MapPin className="h-4 w-4 text-emerald-600 animate-bounce" />
              <span className="text-xs font-semibold text-emerald-800">Town Store:</span>
              <select
                id="town-selector-header"
                value={currentTown}
                onChange={handleTownChange}
                className="bg-transparent text-xs font-bold text-emerald-900 focus:outline-none cursor-pointer pr-1"
              >
                {FRANCHISE_STORES.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.id} ({FRANCHISE_STORES.find(s => s.id === store.id)?.deliveryTimeMins}m Delivery)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switcher & Control Panel */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200">
              {/* Customer Mode */}
              <button
                id="role-btn-customer"
                onClick={() => setActiveRole('customer')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeRole === 'customer'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Shop Mode</span>
              </button>

              {/* Franchise Manager Mode */}
              <button
                id="role-btn-manager"
                onClick={() => setActiveRole('manager')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeRole === 'manager'
                    ? 'bg-amber-500 text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Franchise Admin</span>
              </button>

              {/* Rider Mode */}
              <button
                id="role-btn-rider"
                onClick={() => setActiveRole('rider')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeRole === 'rider'
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Rider Mode</span>
              </button>
            </div>

            {/* Reset Demo Button */}
            <button
              id="reset-demo-btn"
              onClick={() => {
                if (confirm('Are you sure you want to reset all inventories, prices, and orders back to default?')) {
                  resetAllData();
                }
              }}
              title="Reset data to defaults"
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
