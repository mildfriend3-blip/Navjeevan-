import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { Town, Order } from '../types';
import { 
  MapPin, Clock, ChevronUp, ChevronDown, CheckCircle2, ShoppingBag, 
  Phone, Navigation, Sparkles, Timer, Check, Store, Bike, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORE_COORDINATES: Record<Town, { lat: number; lng: number }> = {
  Jalgaon: { lat: 21.0077, lng: 75.5626 },
  Shahada: { lat: 21.5034, lng: 74.4739 },
  Nandurbar: { lat: 21.3687, lng: 74.2384 },
  Dhule: { lat: 20.9042, lng: 74.7749 }
};

export const OrderTrackingDrawer: React.FC = () => {
  const { orders, currentTown } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  const googleMapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<any>(null);
  const leafletRiderMarkerRef = useRef<any>(null);

  // API Key for Google Maps
  const API_KEY =
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  // Find the active order for the current town
  const activeOrder = orders
    .filter(o => o.storeId?.toLowerCase() === currentTown?.toLowerCase())
    .find(o => o.status !== 'delivered' && o.status !== 'DELIVERED' && o.status !== 'cancelled');

  // Rider progress state (0 to 100%)
  const [riderProgress, setRiderProgress] = useState(0);

  useEffect(() => {
    if (!activeOrder) {
      setRiderProgress(0);
      return;
    }

    const status = activeOrder.status.toUpperCase();
    if (status === 'DISPATCHED' || status === 'OUT-FOR-DELIVERY') {
      // If order is dispatched, let's start the progress from 15% and smoothly increase it
      setRiderProgress(15);
      const interval = setInterval(() => {
        setRiderProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95; // Wait at 95% until marked delivered
          }
          return prev + 1.5; // Smooth incremental movement
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === 'DELIVERED') {
      setRiderProgress(100);
    } else {
      // Placed or Preparing
      setRiderProgress(0);
    }
  }, [activeOrder?.status, activeOrder?.id]);

  // Load Google Maps or Leaflet Fallback
  useEffect(() => {
    if (!activeOrder || !isOpen) return;

    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
      // Try to load Google Maps script
      if ((window as any).google && (window as any).google.maps) {
        setIsGoogleMapsLoaded(true);
      } else {
        const scriptId = 'google-maps-tracking-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
          script.async = true;
          script.defer = true;
          script.onload = () => setIsGoogleMapsLoaded(true);
          script.onerror = () => {
            console.warn("Failed to load Google Maps, falling back to Leaflet.");
            loadLeafletFallback();
          };
          document.head.appendChild(script);
        } else {
          script.addEventListener('load', () => setIsGoogleMapsLoaded(true));
        }
      }
    } else {
      loadLeafletFallback();
    }

    function loadLeafletFallback() {
      if ((window as any).L) {
        setIsLeafletLoaded(true);
        return;
      }
      // Load Leaflet CSS
      const linkId = 'leaflet-css';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setIsLeafletLoaded(true);
      document.head.appendChild(script);
    }
  }, [activeOrder, isOpen, API_KEY]);

  // Coordinates calculation
  const storeCoord = activeOrder ? (STORE_COORDINATES[activeOrder.storeId as Town] || STORE_COORDINATES[currentTown] || STORE_COORDINATES.Dhule) : STORE_COORDINATES.Dhule;
  const destLat = activeOrder?.customerLat || (storeCoord.lat - 0.006);
  const destLng = activeOrder?.customerLng || (storeCoord.lng + 0.006);

  const riderLat = storeCoord.lat + (destLat - storeCoord.lat) * (riderProgress / 100);
  const riderLng = storeCoord.lng + (destLng - storeCoord.lng) * (riderProgress / 100);

  // Render Google Maps
  useEffect(() => {
    if (isGoogleMapsLoaded && googleMapRef.current && activeOrder && isOpen) {
      try {
        const google = (window as any).google;
        const mapOptions = {
          center: { lat: (storeCoord.lat + destLat) / 2, lng: (storeCoord.lng + destLng) / 2 },
          zoom: 14,
          disableDefaultUI: true,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry.fill',
              stylers: [{ weight: 2.0 }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e9e9e9' }, { lightness: 17 }],
            },
            {
              featureType: 'landscape',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }, { lightness: 20 }],
            },
          ]
        };

        const map = new google.maps.Map(googleMapRef.current, mapOptions);

        // Store Hub Marker
        new google.maps.Marker({
          position: storeCoord,
          map,
          title: "Store Hub",
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23059669" width="36" height="36">
                <circle cx="12" cy="12" r="10" fill="white" stroke="%23059669" stroke-width="2"/>
                <path d="M6 10h12v10H6z" fill="%23059669"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
          }
        });

        // Destination Marker
        new google.maps.Marker({
          position: { lat: destLat, lng: destLng },
          map,
          title: "Your Home",
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb" width="36" height="36">
                <circle cx="12" cy="12" r="10" fill="white" stroke="%232563eb" stroke-width="2"/>
                <path d="M12 7l6 6H6z" fill="%232563eb"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
          }
        });

        // Rider Marker
        const riderMarker = new google.maps.Marker({
          position: { lat: riderLat, lng: riderLng },
          map,
          title: "Delivery Rider",
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ea580c" width="40" height="40">
                <circle cx="12" cy="12" r="11" fill="white" stroke="%23ea580c" stroke-width="2"/>
                <circle cx="12" cy="8" r="3" fill="%23ea580c"/>
                <path d="M5 18c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v1H5z" fill="%23ea580c"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(36, 36),
          }
        });

        // Path Line
        new google.maps.Polyline({
          path: [storeCoord, { lat: destLat, lng: destLng }],
          geodesic: true,
          strokeColor: '#10b981',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map,
        });

        // Update rider position smoothly
        riderMarker.setPosition({ lat: riderLat, lng: riderLng });

      } catch (err) {
        console.error("Error drawing Google Map:", err);
      }
    }
  }, [isGoogleMapsLoaded, storeCoord, destLat, destLng, riderLat, riderLng, isOpen, activeOrder]);

  // Render Leaflet Map
  useEffect(() => {
    if (isLeafletLoaded && leafletMapRef.current && activeOrder && isOpen) {
      try {
        const L = (window as any).L;
        if (!leafletInstanceRef.current) {
          const map = L.map(leafletMapRef.current, {
            zoomControl: false,
            attributionControl: false
          }).setView([(storeCoord.lat + destLat) / 2, (storeCoord.lng + destLng) / 2], 14);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
          }).addTo(map);

          // Store Marker Icon
          const storeIcon = L.divIcon({
            html: `<div class="bg-emerald-600 text-white p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center h-8 w-8"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          L.marker([storeCoord.lat, storeCoord.lng], { icon: storeIcon }).addTo(map);

          // Customer Home Marker Icon
          const homeIcon = L.divIcon({
            html: `<div class="bg-blue-600 text-white p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center h-8 w-8"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          L.marker([destLat, destLng], { icon: homeIcon }).addTo(map);

          // Delivery Path
          L.polyline([[storeCoord.lat, storeCoord.lng], [destLat, destLng]], {
            color: '#10b981',
            weight: 3.5,
            opacity: 0.8,
            dashArray: '6, 6'
          }).addTo(map);

          // Rider Icon
          const riderIcon = L.divIcon({
            html: `<div class="bg-orange-500 text-white p-2.5 rounded-full border-2 border-white shadow-xl flex items-center justify-center h-9 w-9 animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
            className: '',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          });
          const riderMarker = L.marker([riderLat, riderLng], { icon: riderIcon }).addTo(map);
          leafletRiderMarkerRef.current = riderMarker;

          leafletInstanceRef.current = map;
        } else {
          // Update rider marker position dynamically
          if (leafletRiderMarkerRef.current) {
            leafletRiderMarkerRef.current.setLatLng([riderLat, riderLng]);
          }
        }
      } catch (err) {
        console.error("Error drawing Leaflet Map:", err);
      }
    }
  }, [isLeafletLoaded, storeCoord, destLat, destLng, riderLat, riderLng, isOpen, activeOrder]);

  if (!activeOrder) return null;

  // Active status formatters
  const orderStatus = activeOrder.status.toUpperCase();
  const stepIndex = 
    orderStatus === 'PLACED' ? 1 :
    orderStatus === 'PREPARING' || orderStatus === 'ACCEPTED' ? 2 :
    orderStatus === 'DISPATCHED' || orderStatus === 'OUT-FOR-DELIVERY' ? 3 :
    orderStatus === 'DELIVERED' ? 4 : 1;

  // Dynamic remaining minutes based on rider progress
  const estimatedMin = orderStatus === 'DELIVERED' ? 0 : Math.max(1, Math.round(12 * (1 - riderProgress / 100)));

  return (
    <>
      {/* 1. STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-sans font-extrabold text-sm text-slate-800">
                {orderStatus === 'PLACED' && 'Order Placed'}
                {(orderStatus === 'PREPARING' || orderStatus === 'ACCEPTED') && 'Preparing your order'}
                {(orderStatus === 'DISPATCHED' || orderStatus === 'OUT-FOR-DELIVERY') && 'Rider out for delivery'}
                {orderStatus === 'DELIVERED' && 'Delivered'}
              </p>
              <span className="text-xs text-slate-400 font-mono">({activeOrder.id})</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-500 text-xs mt-0.5 font-sans">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Delivering in <b>{estimatedMin} mins</b></span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-200 hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Track Live</span>
          <Navigation className="h-3.5 w-3.5 animate-pulse" />
        </button>
      </div>

      {/* 2. SLIDE-UP LIVE TRACKING DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs"
            />

            {/* Slider Sheet */}
            <motion.div
              id="live-tracking-drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-slate-50 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden max-w-2xl mx-auto border-t border-slate-100 flex flex-col h-[85vh] sm:h-[80vh]"
            >
              {/* Drawer Pull Tab */}
              <div 
                className="w-full flex justify-center py-3 cursor-pointer bg-white border-b border-slate-100/60"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-12 h-1.5 rounded-full bg-slate-200 hover:bg-slate-300 transition-all" />
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto pb-24">
                
                {/* Header Info */}
                <div className="bg-white px-5 py-6 sm:px-8 border-b border-slate-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                          Live Tracking
                        </span>
                        <p className="text-xs text-slate-400 font-mono">{activeOrder.id}</p>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-sans font-extrabold text-slate-900 mt-2 tracking-tight">
                        {estimatedMin > 0 ? `Arriving in ${estimatedMin} mins` : 'Arrived! Enjoy your food'}
                      </h2>
                    </div>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                    >
                      <ChevronDown className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Pricing/Subtotal Snapshot */}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-dashed border-slate-100 pt-4 font-sans">
                    <div className="flex items-center space-x-1.5">
                      <ShoppingBag className="h-4 w-4 text-emerald-600" />
                      <span>{activeOrder.items.length} items • <b>₹{activeOrder.total}</b></span>
                    </div>
                    <span>Expected delivery: <b>{new Date(new Date(activeOrder.createdAt).getTime() + 12 * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b></span>
                  </div>
                </div>

                {/* Interactive Map Block */}
                <div className="relative h-[250px] sm:h-[280px] w-full bg-slate-100 border-b border-slate-200/60 shadow-inner">
                  {API_KEY && API_KEY !== 'YOUR_API_KEY' ? (
                    <div ref={googleMapRef} className="absolute inset-0 h-full w-full" />
                  ) : (
                    <div ref={leafletMapRef} className="absolute inset-0 h-full w-full" />
                  )}

                  {/* Map Badges overlays */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-slate-100 flex items-center space-x-1.5 z-[1000] pointer-events-none">
                    <Store className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{activeOrder.storeId} Branch Hub</span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-slate-100 flex items-center space-x-1.5 z-[1000] pointer-events-none">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-[10px] font-bold text-slate-700">Delivery Address</span>
                  </div>
                </div>

                {/* Progress Timeline steps */}
                <div className="bg-white p-5 sm:p-8 rounded-3xl mt-4 mx-4 shadow-sm border border-slate-100/80">
                  <h3 className="font-sans font-extrabold text-sm text-slate-800 mb-6 flex items-center space-x-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-spin" />
                    <span>Real-Time Delivery Timeline</span>
                  </h3>

                  <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    
                    {/* Step 1: Order Placed */}
                    <div className="flex items-start space-x-4 relative">
                      <div className={`z-10 flex items-center justify-center h-9 w-9 rounded-full border-2 transition-all ${
                        stepIndex >= 1 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {stepIndex > 1 ? <Check className="h-4.5 w-4.5 stroke-[3]" /> : <ShoppingBag className="h-4.5 w-4.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-sans font-extrabold text-xs sm:text-sm ${stepIndex >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Order Placed & Confirmed</p>
                          {stepIndex === 1 && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-extrabold">Active</span>}
                        </div>
                        <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">Navjeevan Franchise has received your request</p>
                      </div>
                    </div>

                    {/* Step 2: Preparing */}
                    <div className="flex items-start space-x-4 relative">
                      <div className={`z-10 flex items-center justify-center h-9 w-9 rounded-full border-2 transition-all ${
                        stepIndex >= 2 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {stepIndex > 2 ? <Check className="h-4.5 w-4.5 stroke-[3]" /> : <Store className="h-4.5 w-4.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-sans font-extrabold text-xs sm:text-sm ${stepIndex >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Accepted & Packaging</p>
                          {stepIndex === 2 && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-extrabold">Active</span>}
                        </div>
                        <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">Store executive is assembling and packing fresh products</p>
                      </div>
                    </div>

                    {/* Step 3: Out for Delivery */}
                    <div className="flex items-start space-x-4 relative">
                      <div className={`z-10 flex items-center justify-center h-9 w-9 rounded-full border-2 transition-all ${
                        stepIndex >= 3 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {stepIndex > 3 ? <Check className="h-4.5 w-4.5 stroke-[3]" /> : <Bike className="h-4.5 w-4.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-sans font-extrabold text-xs sm:text-sm ${stepIndex >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Out for Delivery</p>
                          {stepIndex === 3 && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-extrabold">Moving</span>}
                        </div>
                        <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">Rider is delivering fresh items to your precise GPS location</p>
                      </div>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="flex items-start space-x-4 relative">
                      <div className={`z-10 flex items-center justify-center h-9 w-9 rounded-full border-2 transition-all ${
                        stepIndex >= 4 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-sans font-extrabold text-xs sm:text-sm ${stepIndex >= 4 ? 'text-slate-800' : 'text-slate-400'}`}>Delivered Successfully</p>
                          {stepIndex === 4 && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold">Complete</span>}
                        </div>
                        <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">Delivered safe, fresh, and contact-free</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Rider Details Card */}
                {activeOrder.riderName && (
                  <div className="bg-white p-5 sm:p-6 rounded-3xl mt-4 mx-4 shadow-sm border border-slate-100/80 flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100/50 flex items-center justify-center">
                        <Bike className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide">Your Delivery Executive</p>
                        <p className="font-sans font-extrabold text-slate-800 text-sm sm:text-base mt-0.5">{activeOrder.riderName}</p>
                        {activeOrder.riderPhone && <p className="text-slate-500 text-xs font-mono mt-0.5">{activeOrder.riderPhone}</p>}
                      </div>
                    </div>

                    {activeOrder.riderPhone && (
                      <a 
                        href={`tel:${activeOrder.riderPhone}`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3.5 rounded-2xl transition-all shadow-2xs hover:scale-105 active:scale-95"
                      >
                        <Phone className="h-5 w-5 text-emerald-600" />
                      </a>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
