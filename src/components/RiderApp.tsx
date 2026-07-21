import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { FRANCHISE_STORES } from '../data/initialData';
import { Town, Order, OrderStatus } from '../types';
import { 
  Truck, Navigation, Phone, MapPin, CheckCircle2, ShoppingBag, 
  Sparkles, User, ShieldCheck, Play, Signal, Battery, Clock, Check,
  Compass, AlertTriangle, ChevronRight, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const RiderApp: React.FC = () => {
  const {
    orders,
    currentTown,
    setCurrentTown,
    updateOrderStatus
  } = useApp();

  const [activeRiderName] = useState('Kunal Patil (Express Pilot)');
  const [activeRiderPhone] = useState('+91 88888 22222');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Local notification for simulation actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Available deliveries in the current town
  // Orders that are either 'DISPATCHED' or 'dispatched'
  const localRiderJobs = useMemo(() => {
    return orders.filter(o => 
      o.storeId?.toLowerCase() === currentTown?.toLowerCase() && 
      (o.status === 'DISPATCHED' || o.status === 'dispatched')
    );
  }, [orders, currentTown]);

  const selectedJob = useMemo(() => {
    if (selectedOrderId) {
      const found = orders.find(o => o.id === selectedOrderId && o.storeId?.toLowerCase() === currentTown?.toLowerCase());
      if (found && (found.status === 'DISPATCHED' || found.status === 'dispatched' || found.status === 'DELIVERED' || found.status === 'delivered')) {
        return found;
      }
    }
    // Default to the first job
    return localRiderJobs[0] || null;
  }, [orders, localRiderJobs, selectedOrderId, currentTown]);

  const activeStore = useMemo(() => {
    return FRANCHISE_STORES.find(s => s.id === currentTown) || FRANCHISE_STORES[0];
  }, [currentTown]);

  const [localMapStep, setLocalMapStep] = useState<number>(2);

  React.useEffect(() => {
    if (!selectedJob) {
      setLocalMapStep(2);
    } else if (selectedJob.status === 'DELIVERED' || selectedJob.status === 'delivered') {
      setLocalMapStep(3);
    } else {
      setLocalMapStep(2);
    }
  }, [selectedJob]);

  // Map route simulation coordinates and checkpoints
  const checkpoints = [
    { label: `${currentTown} Store Hub`, desc: 'Acquire packets from dispatch counter', distance: '1.2 km' },
    { label: 'Shivaji Marg Bypass', desc: 'Cruising through city center', distance: '0.7 km' },
    { label: 'Local Security Gate', desc: 'Sector clearance protocol', distance: '0.2 km' },
    { label: 'Customer Doorstep', desc: 'Arrived at destination address', distance: '0.0 km' }
  ];

  // Derive step for GPS simulator map
  const simulatedMapStep = useMemo(() => {
    if (!selectedJob) return 0;
    if (selectedJob.status === 'DELIVERED' || selectedJob.status === 'delivered') return 3;
    return localMapStep;
  }, [selectedJob, localMapStep]);

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto px-2">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black text-xs px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <Sparkles size={14} className="animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: High-Contrast Phone Viewport (Rider app layout) */}
        <div className="lg:col-span-7 flex justify-center">
          
          {/* Simulated Mobile Device Frame */}
          <div className="w-full max-w-[400px] aspect-[9/19] bg-slate-950 text-slate-100 rounded-[48px] border-[10px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">
            
            {/* Speaker & Camera notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-40 flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-950 rounded-full" />
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full ml-3" />
            </div>

            {/* Simulated Phone Status Bar */}
            <div className="bg-slate-950 text-[10px] px-6 pt-7 pb-2 flex justify-between items-center text-slate-400 font-bold tracking-tight shrink-0 select-none">
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>12:45 PM</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[9px] text-emerald-400 font-extrabold tracking-widest">5G</span>
                <Signal size={10} className="text-emerald-400" />
                <span className="text-[9px]">98%</span>
                <Battery size={10} className="text-emerald-400" />
              </div>
            </div>

            {/* Mobile App Header */}
            <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-xl">
                  <Truck size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white tracking-tight">Express Pilot</h3>
                  <span className="block text-[9px] text-emerald-400 font-bold font-mono">STATION: {currentTown}</span>
                </div>
              </div>

              {/* Station select dropdown inside phone header */}
              <div className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-[10px]">
                <select
                  value={currentTown}
                  onChange={(e) => {
                    setCurrentTown(e.target.value as Town);
                    setSelectedOrderId(null);
                  }}
                  className="bg-transparent font-black text-emerald-400 focus:outline-none cursor-pointer"
                >
                  {FRANCHISE_STORES.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">{s.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Mobile App Body */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
              
              {selectedJob ? (
                <div className="space-y-4">
                  
                  {/* Customer Contact & Phone Shortcut card */}
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Customer Name</span>
                        <h4 className="text-sm font-black text-white mt-0.5">{selectedJob.customerName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{selectedJob.customerPhone}</span>
                      </div>

                      {/* Phone call shortcut button */}
                      <a
                        href={`tel:${selectedJob.customerPhone}`}
                        onClick={() => {
                          showToast(`Calling customer ${selectedJob.customerName} at ${selectedJob.customerPhone}...`);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center"
                        title="Call Customer"
                      >
                        <Phone size={14} className="stroke-[3]" />
                      </a>
                    </div>

                    {/* Delivery Address block */}
                    <div className="border-t border-slate-800/50 pt-2.5">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Delivery Destination</span>
                      <p className="text-xs text-slate-200 mt-1 flex items-start gap-1.5 leading-relaxed font-semibold">
                        <MapPin size={12} className="text-red-500 shrink-0 mt-0.5" />
                        <span>{selectedJob.customerAddress}</span>
                      </p>
                    </div>

                    {/* Customer delivery notes ("Leave at door", "Avoid ringing bell") */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mt-2 flex items-start gap-2">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block font-mono">Rider Instruction / Note</span>
                        <p className="text-[11px] font-black text-amber-200 mt-0.5">
                          "{selectedJob.deliveryInstruction || 'Avoid ringing bell'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* HIGH-CONTRAST SIMULATED GPS ROUTE / MAP DIRECTIONS FRAME */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2.5xl overflow-hidden">
                    
                    <div className="bg-slate-950/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-800/60">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase font-mono flex items-center gap-1">
                        <Compass size={10} className="animate-spin text-emerald-400" /> Live GPS Navigator
                      </span>
                      <span className="text-[10px] font-black text-emerald-400 font-mono">
                        {checkpoints[simulatedMapStep]?.distance} Left
                      </span>
                    </div>

                    {/* Map Visuals Container */}
                    <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
                      
                      {/* Grid overlay lines (streets blueprint) */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:16px_16px]" />
                      
                      {/* Stylized Roadmap/Streets (visual CSS block paths) */}
                      <div className="absolute inset-0 z-0">
                        {/* Street 1 */}
                        <div className="absolute top-1/4 left-0 w-full h-8 bg-slate-900/40 border-y border-slate-800/30 rotate-1 flex items-center px-4">
                          <span className="text-[7px] text-slate-600 font-mono uppercase tracking-widest">Shivaji Marg</span>
                        </div>
                        {/* Street 2 */}
                        <div className="absolute top-2/3 left-0 w-full h-8 bg-slate-900/40 border-y border-slate-800/30 -rotate-2 flex items-center justify-end px-4">
                          <span className="text-[7px] text-slate-600 font-mono uppercase tracking-widest">Main Ring Road</span>
                        </div>
                        {/* Crossroads */}
                        <div className="absolute left-1/3 top-0 w-8 h-full bg-slate-900/50 border-x border-slate-800/30" />
                      </div>

                      {/* Moving route path line */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        <path 
                          d="M 50,110 L 130,110 L 250,55 L 340,55" 
                          fill="none" 
                          stroke="#1e293b" 
                          strokeWidth="4" 
                          strokeLinecap="round" 
                        />
                        <path 
                          d="M 50,110 L 130,110 L 250,55 L 340,55" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="4" 
                          strokeLinecap="round" 
                          strokeDasharray="300"
                          strokeDashoffset={300 - (simulatedMapStep * 100)}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>

                      {/* Map Nodes Markers */}
                      
                      {/* Franchise Hub Node */}
                      <div className="absolute left-12 bottom-8 flex flex-col items-center z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-md transition-all ${
                          simulatedMapStep >= 0 ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}>
                          <ShoppingBag size={10} />
                        </div>
                        <span className="text-[7px] font-bold text-slate-500 uppercase font-mono mt-1 bg-slate-950 px-1 rounded">Hub</span>
                      </div>

                      {/* Transit/Bypass Node */}
                      <div className="absolute left-32 bottom-8 flex flex-col items-center z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-md transition-all ${
                          simulatedMapStep >= 1 ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}>
                          <Compass size={10} className="rotate-45" />
                        </div>
                        <span className="text-[7px] font-bold text-slate-500 uppercase font-mono mt-1 bg-slate-950 px-1 rounded">Transit</span>
                      </div>

                      {/* Community Gate Node */}
                      <div className="absolute right-32 top-8 flex flex-col items-center z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-md transition-all ${
                          simulatedMapStep >= 2 ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}>
                          <ShieldCheck size={10} />
                        </div>
                        <span className="text-[7px] font-bold text-slate-500 uppercase font-mono mt-1 bg-slate-950 px-1 rounded">Gate</span>
                      </div>

                      {/* Customer Node */}
                      <div className="absolute right-12 top-8 flex flex-col items-center z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md transition-all ${
                          simulatedMapStep >= 3 ? 'bg-red-600 border-red-400 text-white animate-bounce' : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}>
                          <MapPin size={12} className="fill-white" />
                        </div>
                        <span className="text-[7px] font-black text-red-400 uppercase font-mono mt-1 bg-slate-950 px-1 rounded">Cust</span>
                      </div>

                      {/* Animated Scooter Rider Marker */}
                      <motion.div 
                        className="absolute z-20 pointer-events-none"
                        animate={
                          simulatedMapStep === 0 ? { x: -110, y: 22 } :
                          simulatedMapStep === 1 ? { x: -35, y: 22 } :
                          simulatedMapStep === 2 ? { x: 55, y: -30 } :
                          { x: 135, y: -30 }
                        }
                        transition={{ type: "spring", stiffness: 60, damping: 15 }}
                      >
                        <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg border border-white flex items-center justify-center">
                          <Truck size={12} className="stroke-[3]" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Active Navigation Instructions */}
                    <div className="bg-slate-900 px-4 py-3 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="text-left leading-tight">
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block font-mono">NAVIGATING TO</span>
                        <span className="text-xs font-bold text-white block mt-0.5">{checkpoints[simulatedMapStep]?.label}</span>
                        <p className="text-[10px] text-slate-400 font-medium">{checkpoints[simulatedMapStep]?.desc}</p>
                      </div>

                      {/* Step Simulation driver button */}
                      {simulatedMapStep < 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalMapStep(prev => Math.min(3, prev + 1));
                            showToast("Moving to next checkpoint on map...");
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-extrabold text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                        >
                          Next Step ⚡
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Mark Delivered Button */}
                  <div className="pt-2">
                    {(selectedJob.status === 'DISPATCHED' || selectedJob.status === 'dispatched' || selectedJob.status === 'out-for-delivery') ? (
                      <button
                        onClick={() => {
                          updateOrderStatus(selectedJob.id, 'DELIVERED', activeRiderName, activeRiderPhone);
                          showToast(`Success! Order ${selectedJob.id} delivered.`);
                          setSelectedOrderId(null);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 uppercase tracking-wider"
                      >
                        <CheckCircle2 size={14} /> Mark Delivered
                      </button>
                    ) : (
                      <div className="text-center p-3.5 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs font-bold">
                        ✓ Order Delivered Successfully
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center py-12 text-center">
                  <Navigation className="text-slate-700 mb-3 animate-bounce" size={44} />
                  <p className="text-slate-400 text-xs font-bold">No dispatch job selected</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                    Choose an order from the list on the right to start navigation & doorstep simulation!
                  </p>
                </div>
              )}

            </div>

            {/* Bottom Safe Area Bar */}
            <div className="h-4 bg-slate-950 shrink-0 flex items-center justify-center">
              <div className="w-28 h-1 bg-slate-700 rounded-full" />
            </div>

          </div>

        </div>

        {/* Right column: Delivery Jobs list queue (tablet/desktop helper list) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white border border-slate-150 rounded-3xl p-5 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  Active Deliveries ({localRiderJobs.length})
                </h3>
                <p className="text-[10px] text-slate-400">Assigned orders in {currentTown} region</p>
              </div>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                Rider Mode
              </span>
            </div>

            {localRiderJobs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="bg-slate-50 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-300">
                  <CheckCircle size={22} />
                </div>
                <p className="text-slate-700 text-xs font-bold">Excellent! All orders fulfilled.</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  When customers place new orders or store managers prepare them, they will immediately show up in this queue.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {localRiderJobs.map((job) => (
                  <button
                    key={job.id}
                    id={`rider-job-list-${job.id}`}
                    onClick={() => {
                      setSelectedOrderId(job.id);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                      selectedJob?.id === job.id
                        ? 'border-emerald-500 bg-emerald-50/10 shadow-xs'
                        : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-black text-slate-800">{job.id}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        (job.status === 'DISPATCHED' || job.status === 'dispatched')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-500 text-white shadow-xs'
                      }`}>
                        {(job.status === 'DISPATCHED' || job.status === 'dispatched') ? 'Dispatched' : job.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span className="text-xs font-black text-slate-700">{job.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="text-[11px] text-slate-500 truncate">{job.customerAddress}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-black font-mono">
                      <span>{job.items.length} Packages</span>
                      <span className="text-emerald-700 font-extrabold text-xs">₹{job.total} Total</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Presenter Guide Panel */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 space-y-3 shadow-md">
            <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse" /> Presenter Fast-Track
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
              To test the full supply-chain cycle in your presentation:
            </p>
            <ol className="text-[10px] text-slate-400 space-y-1.5 pl-4 list-decimal font-semibold">
              <li>Open a new incognito window or switch users to <strong className="text-indigo-200">Customer Demo</strong> to place a new order.</li>
              <li>Switch to <strong className="text-indigo-200">Store Manager</strong> to accept the order and mark it as <strong className="text-emerald-400">Preparing / Done Packing</strong>.</li>
              <li>Return to this <strong className="text-amber-300">Rider Portal</strong> to accept, pick up, and deliver it sequentially!</li>
            </ol>
          </div>

        </div>

      </div>

    </div>
  );
};
