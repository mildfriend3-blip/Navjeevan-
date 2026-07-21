import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { FRANCHISE_STORES } from '../data/initialData';
import { Town, Order, OrderStatus } from '../types';
import { 
  Truck, Navigation, Phone, MapPin, CheckCircle2, ShoppingBag, 
  ChevronRight, Sparkles, User, ShieldCheck, Play 
} from 'lucide-react';
import { motion } from 'motion/react';

export const RiderApp: React.FC = () => {
  const {
    orders,
    currentTown,
    setCurrentTown,
    updateOrderStatus
  } = useApp();

  const [activeRiderName] = useState('Kunal Patil (Express Pilot)');
  const [activeRiderPhone] = useState('+91 94222 11000');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Simulated route navigation step
  const [simulatedStep, setSimulatedStep] = useState(0);

  // Available deliveries in the current town
  // Orders that are either 'preparing' (ready to dispatch) or already assigned to this rider in 'out-for-delivery' state
  const localRiderJobs = useMemo(() => {
    return orders.filter(o => 
      o.storeId === currentTown && 
      (o.status === 'preparing' || (o.status === 'out-for-delivery' && o.riderName === activeRiderName))
    );
  }, [orders, currentTown]);

  const selectedJob = useMemo(() => {
    if (selectedOrderId) {
      return orders.find(o => o.id === selectedOrderId && o.storeId === currentTown);
    }
    // Auto-select first job if available
    return localRiderJobs[0] || null;
  }, [orders, localRiderJobs, selectedOrderId, currentTown]);

  const handleAcceptDelivery = (orderId: string) => {
    updateOrderStatus(orderId, 'out-for-delivery', activeRiderName, activeRiderPhone);
    setSimulatedStep(1); // Start journey simulation
  };

  const handleCompleteDelivery = (orderId: string) => {
    updateOrderStatus(orderId, 'delivered');
    setSimulatedStep(3); // Delivered stage
  };

  const activeStore = useMemo(() => {
    return FRANCHISE_STORES.find(s => s.id === currentTown) || FRANCHISE_STORES[0];
  }, [currentTown]);

  // Simulated navigation checkpoints
  const checkpoints = [
    { label: 'Franchise Store Hub', desc: 'Packing completed & verified' },
    { label: 'Shivaji Marg Bypass', desc: 'Crossing highway junction (3 mins left)' },
    { label: 'Local Community Gate', desc: 'Security clearance requested (1 min left)' },
    { label: 'Customer Doorstep', desc: 'Arrived, ringing bell!' }
  ];

  return (
    <div className="py-6 space-y-6 max-w-3xl mx-auto">
      
      {/* Rider Header Profile */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500 p-2.5 rounded-2xl text-slate-950 shadow-md">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold font-mono">PILOT ONLINE</span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            </div>
            <h1 className="text-base font-extrabold">{activeRiderName}</h1>
          </div>
        </div>

        <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
          <select
            id="rider-town-selector"
            value={currentTown}
            onChange={(e) => {
              setCurrentTown(e.target.value as Town);
              setSelectedOrderId(null);
              setSimulatedStep(0);
            }}
            className="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer"
          >
            {FRANCHISE_STORES.map(s => (
              <option key={s.id} value={s.id}>Riding in {s.id}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Side: Delivery Jobs list */}
        <div className="md:col-span-5 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
            Active Jobs Queue ({localRiderJobs.length})
          </h2>

          {localRiderJobs.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-xs">
              <Truck className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-slate-500 text-xs font-bold">No active delivery requests in {currentTown}.</p>
              <p className="text-[10px] text-slate-400 mt-1">Orders in 'Preparing' state in the manager dashboard will show up here to be delivered!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localRiderJobs.map((job) => (
                <button
                  key={job.id}
                  id={`rider-job-${job.id}`}
                  onClick={() => {
                    setSelectedOrderId(job.id);
                    setSimulatedStep(job.status === 'out-for-delivery' ? 1 : 0);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedJob?.id === job.id
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                      : 'border-slate-200/60 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-black text-slate-800">{job.id}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                      job.status === 'preparing'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {job.status === 'preparing' ? 'Ready to pick' : 'On Trip'}
                    </span>
                  </div>

                  <p className="text-xs font-extrabold text-slate-800 truncate">Cust: {job.customerName}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{job.customerAddress}</p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-semibold font-mono">
                    <span>{job.items.length} Packets</span>
                    <span className="text-emerald-700 font-extrabold">₹{job.total} Total</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Active Navigation Simulator map */}
        <div className="md:col-span-7">
          {selectedJob ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5">
              
              {/* Job Summary */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Fulfilling order</span>
                  <h3 className="font-mono font-black text-sm text-slate-800">{selectedJob.id}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Customer address</span>
                  <span className="text-xs font-bold text-slate-700">{selectedJob.customerAddress}</span>
                </div>
              </div>

              {/* Delivery items details */}
              <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Items to hand over:</span>
                {selectedJob.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between font-mono text-slate-600 text-[11px]">
                    <span>{it.name} ({it.unit})</span>
                    <span className="font-bold text-slate-800">x{it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* TRIP CONTROLS */}
              {selectedJob.status === 'preparing' ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center text-xs text-amber-800 font-medium">
                    🛒 Packets are verified and waiting at **{activeStore.name}** counter. Please accept to head out.
                  </div>
                  <button
                    id={`rider-accept-btn-${selectedJob.id}`}
                    onClick={() => handleAcceptDelivery(selectedJob.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Play size={14} /> Accept & Start Navigation
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* SIMULATED MAP ROUTE GRAPHIC */}
                  <div className="relative bg-slate-50 rounded-3xl p-4.5 border border-slate-100 overflow-hidden shadow-inner">
                    
                    {/* Visual route line */}
                    <div className="absolute top-1/2 left-6 right-6 h-1 bg-slate-200 transform -translate-y-1/2 z-0" />
                    <div 
                      className="absolute top-1/2 left-6 h-1 bg-emerald-500 transform -translate-y-1/2 z-0 transition-all duration-500" 
                      style={{ width: `${(simulatedStep / 3) * 100}%` }}
                    />

                    <div className="relative z-10 flex justify-between items-center text-center">
                      {/* Hub Point */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-xs transition-all ${
                          simulatedStep >= 0 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          <ShoppingBag size={14} />
                        </div>
                        <span className="text-[9px] font-extrabold mt-1 text-slate-700">Hub</span>
                      </div>

                      {/* Crossing Point */}
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => setSimulatedStep(1)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-xs transition-all ${
                            simulatedStep >= 1 ? 'bg-emerald-600 text-white border-emerald-700 font-black' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Navigation size={13} className="rotate-45" />
                        </button>
                        <span className="text-[9px] font-bold mt-1 text-slate-700">Transit</span>
                      </div>

                      {/* Gateway Point */}
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => setSimulatedStep(2)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-xs transition-all ${
                            simulatedStep >= 2 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <MapPin size={13} />
                        </button>
                        <span className="text-[9px] font-bold mt-1 text-slate-700">Gate</span>
                      </div>

                      {/* Customer Point */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-xs transition-all ${
                          simulatedStep >= 3 ? 'bg-emerald-600 text-white border-emerald-700 animate-bounce' : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          <CheckCircle2 size={14} />
                        </div>
                        <span className="text-[9px] font-extrabold mt-1 text-slate-700">Cust</span>
                      </div>
                    </div>

                    {/* Active Checkpoint explanation */}
                    <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block font-mono">GPS CHECKPOINT: {simulatedStep + 1}/4</span>
                        <span className="text-xs font-black text-slate-800">{checkpoints[simulatedStep]?.label}</span>
                        <p className="text-[10px] text-slate-500 font-semibold">{checkpoints[simulatedStep]?.desc}</p>
                      </div>

                      {simulatedStep < 3 && (
                        <button
                          onClick={() => setSimulatedStep((prev) => Math.min(3, prev + 1))}
                          className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Simulate Drive ⚡
                        </button>
                      )}
                    </div>
                  </div>

                  {/* COMPLETE DELIVERY BUTTON */}
                  <button
                    id={`rider-complete-btn-${selectedJob.id}`}
                    onClick={() => handleCompleteDelivery(selectedJob.id)}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-emerald-400 font-extrabold text-xs py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Confirm Doorstep Handover & Complete Job
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-150 rounded-3xl p-12 text-center h-full flex flex-col justify-center items-center">
              <Navigation className="text-slate-300 mb-2 animate-pulse" size={40} />
              <p className="text-slate-500 text-sm font-semibold">Ready for dispatch.</p>
              <p className="text-xs text-slate-400 mt-1">Select a pending job from the checklist to open GPS map simulation.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
