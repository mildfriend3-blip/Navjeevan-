import React from 'react';
import { AppProvider, useApp } from './components/AppContext';
import { Header } from './components/Header';
import { CustomerApp } from './components/CustomerApp';
import { ManagerDashboard } from './components/ManagerDashboard';
import { RiderApp } from './components/RiderApp';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Truck, ShoppingBag, Clock, Sparkles } from 'lucide-react';

function AppContent() {
  const { activeRole } = useApp();

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased text-slate-800">
      {/* Universal Control Header */}
      <Header />

      {/* Main Workspace Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeRole === 'customer' && <CustomerApp />}
            {activeRole === 'manager' && <ManagerDashboard />}
            {activeRole === 'rider' && <RiderApp />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Aesthetic Professional Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center text-white">
                <span className="font-extrabold text-lg tracking-tight">Navjeevan</span>
                <span className="font-black text-lg text-emerald-400 ml-1">Plus</span>
                <span className="ml-2 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-sm">SUPER SHOP</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Empowering local merchants via hyper-local quick-commerce logistics.</p>
            </div>

            {/* Franchise Coverage List */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Franchise network:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Jalgaon', 'Shahada', 'Nandurbar', 'Dhule'].map(city => (
                  <span key={city} className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Commerce Guarantees Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
                <Clock size={16} />
              </div>
              <div>
                <strong className="text-slate-200 block">10-Min Delivery</strong>
                <span className="text-[10px] text-slate-500">Hyperlocal logistics dispatch</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-amber-400/10 p-2 rounded-xl text-amber-400">
                <ShieldCheck size={16} />
              </div>
              <div>
                <strong className="text-slate-200 block">Store Quality Guarantee</strong>
                <span className="text-[10px] text-slate-500">Fresh vegetables & verified dairy</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-blue-400/10 p-2 rounded-xl text-blue-400">
                <Truck size={16} />
              </div>
              <div>
                <strong className="text-slate-200 block">Smart Store Matcher</strong>
                <span className="text-[10px] text-slate-500">Direct regional store assignment</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-indigo-400/10 p-2 rounded-xl text-indigo-400">
                <Sparkles size={16} />
              </div>
              <div>
                <strong className="text-slate-200 block">Franchise Dashboard</strong>
                <span className="text-[10px] text-slate-500">Dynamic stock & local prices</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>© 2026 Navjeevan Plus Super Shop Ltd. All Rights Reserved.</span>
            <div className="flex gap-4">
              <span className="hover:text-white cursor-pointer font-bold">Privacy Policy</span>
              <span>·</span>
              <span className="hover:text-white cursor-pointer font-bold">Franchise Terms</span>
              <span>·</span>
              <span className="hover:text-white cursor-pointer font-bold">Rider Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
