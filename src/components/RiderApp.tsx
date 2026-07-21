import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { FRANCHISE_STORES } from '../data/initialData';
import { Town, Order, OrderStatus } from '../types';
import { 
  Truck, Navigation, Phone, MapPin, CheckCircle2, ShoppingBag, 
  Sparkles, User, ShieldCheck, Play, Signal, Battery, Clock, Check,
  Compass, AlertTriangle, ChevronRight, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORE_COORDINATES: Record<Town, { lat: number; lng: number }> = {
  Jalgaon: { lat: 21.0077, lng: 75.5626 },
  Shahada: { lat: 21.5034, lng: 74.4739 },
  Nandurbar: { lat: 21.3687, lng: 74.2384 },
  Dhule: { lat: 20.9042, lng: 74.7749 }
};

const fetchOSRMRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,
      {
        headers: { 'User-Agent': 'Navjeevan-Plus-App' }
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates; // [lng, lat]
        const path = coords.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }));
        const distanceMeters = data.routes[0].distance || 1500;
        const durationSeconds = data.routes[0].duration || 240;
        return { path, distance: (distanceMeters / 1000).toFixed(1), duration: Math.ceil(durationSeconds / 60) };
      }
    }
  } catch (err) {
    console.warn("OSM routing request failed:", err);
  }
  return null;
};

const createGridFallbackPath = (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
  const midLat = start.lat + (end.lat - start.lat) * 0.4;
  const midLng = start.lng + (end.lng - start.lng) * 0.6;
  return [
    start,
    { lat: midLat, lng: start.lng },
    { lat: midLat, lng: midLng },
    { lat: end.lat, lng: midLng },
    end
  ];
};

function interpolatePath(path: { lat: number; lng: number }[], progress: number): { lat: number; lng: number } {
  if (!path || path.length === 0) return { lat: 0, lng: 0 };
  if (path.length === 1) return path[0];
  if (progress <= 0) return path[0];
  if (progress >= 100) return path[path.length - 1];

  const getDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
  };

  let totalDist = 0;
  const segments: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const d = getDistance(path[i], path[i + 1]);
    segments.push(d);
    totalDist += d;
  }

  if (totalDist === 0) return path[0];

  const targetDist = totalDist * (progress / 100);
  let accumulatedDist = 0;
  for (let i = 0; i < segments.length; i++) {
    if (accumulatedDist + segments[i] >= targetDist) {
      const segmentProgress = (targetDist - accumulatedDist) / segments[i];
      const p1 = path[i];
      const p2 = path[i + 1];
      return {
        lat: p1.lat + (p2.lat - p1.lat) * segmentProgress,
        lng: p1.lng + (p2.lng - p1.lng) * segmentProgress
      };
    }
    accumulatedDist += segments[i];
  }
  return path[path.length - 1];
}

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

  useEffect(() => {
    if (!selectedJob) {
      setLocalMapStep(2);
    } else if (selectedJob.status === 'DELIVERED' || selectedJob.status === 'delivered') {
      setLocalMapStep(3);
    } else {
      setLocalMapStep(2);
    }
  }, [selectedJob]);

  // Derive step for GPS simulator map
  const simulatedMapStep = useMemo(() => {
    if (!selectedJob) return 0;
    if (selectedJob.status === 'DELIVERED' || selectedJob.status === 'delivered') return 3;
    return localMapStep;
  }, [selectedJob, localMapStep]);

  // MAP INTEGRATION STATE & EFFECTS (RIDER PORTAL - DARK MODE NIGHT STYLE)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleRiderMarkerRef = useRef<any>(null);
  const googlePolylineRef = useRef<any>(null);
  
  const leafletMapInstanceRef = useRef<any>(null);
  const leafletRiderMarkerRef = useRef<any>(null);
  
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  const [routeCoordinates, setRouteCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [routeDistance, setRouteDistance] = useState<string>('1.4 km');
  const [routeDuration, setRouteDuration] = useState<number>(4);

  const storeCoord = useMemo(() => {
    return selectedJob ? (STORE_COORDINATES[selectedJob.storeId as Town] || STORE_COORDINATES[currentTown] || STORE_COORDINATES.Dhule) : STORE_COORDINATES.Dhule;
  }, [selectedJob, currentTown]);

  const destLat = selectedJob?.customerLat || (storeCoord.lat - 0.006);
  const destLng = selectedJob?.customerLng || (storeCoord.lng + 0.006);

  // Dynamic Metrics calculation
  const remainingFraction = Math.max(0, 1 - (simulatedMapStep / 3));
  const rawDistNumber = parseFloat(routeDistance) || 1.4;
  const remainingDist = (rawDistNumber * remainingFraction).toFixed(1);
  const remainingTime = Math.ceil(routeDuration * remainingFraction);

  const checkpoints = useMemo(() => [
    { label: `${currentTown} Store Hub`, desc: 'Acquire packets from dispatch counter', distance: `${rawDistNumber.toFixed(1)} km` },
    { label: 'Shivaji Marg Bypass', desc: 'Cruising through city center', distance: `${(rawDistNumber * 0.6).toFixed(1)} km` },
    { label: 'Local Security Gate', desc: 'Sector clearance protocol', distance: `${(rawDistNumber * 0.2).toFixed(1)} km` },
    { label: 'Customer Doorstep', desc: 'Arrived at destination address', distance: '0.0 km' }
  ], [currentTown, rawDistNumber]);

  // Load Google Maps or Leaflet Fallback
  useEffect(() => {
    if (!selectedJob) return;

    const API_KEY =
      (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      '';

    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
      if ((window as any).google && (window as any).google.maps) {
        setIsGoogleMapsLoaded(true);
      } else {
        const scriptId = 'google-maps-rider-script';
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
          const handler = () => setIsGoogleMapsLoaded(true);
          script.addEventListener('load', handler);
          return () => script.removeEventListener('load', handler);
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
      const linkId = 'leaflet-css';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setIsLeafletLoaded(true);
      document.head.appendChild(script);
    }
  }, [selectedJob]);

  // Auto route calculation
  useEffect(() => {
    if (!selectedJob) {
      setRouteCoordinates([]);
      return;
    }

    const start = storeCoord;
    const end = { lat: destLat, lng: destLng };
    let isMounted = true;

    const loadRoute = async () => {
      // 1. Try Google
      if ((window as any).google?.maps?.DirectionsService) {
        try {
          const directionsService = new (window as any).google.maps.DirectionsService();
          const result = await new Promise<any>((resolve, reject) => {
            directionsService.route(
              {
                origin: start,
                destination: end,
                travelMode: (window as any).google.maps.TravelMode.DRIVING,
              },
              (res: any, status: any) => {
                if (status === 'OK' && res) resolve(res);
                else reject(status);
              }
            );
          });

          if (result && result.routes && result.routes[0] && isMounted) {
            const legs = result.routes[0].legs[0];
            const coords: { lat: number; lng: number }[] = [];
            legs.steps.forEach((step: any) => {
              step.path.forEach((p: any) => {
                coords.push({ lat: p.lat(), lng: p.lng() });
              });
            });
            setRouteCoordinates(coords);
            setRouteDistance(legs.distance?.text || `${(legs.distance?.value / 1000).toFixed(1)} km`);
            setRouteDuration(Math.ceil(legs.duration?.value / 60) || 4);
            return;
          }
        } catch (err) {
          console.warn("Rider Map Google directions failed, trying OSRM:", err);
        }
      }

      // 2. Try OSRM
      try {
        const osmRoute = await fetchOSRMRoute(start, end);
        if (osmRoute && osmRoute.path && osmRoute.path.length > 0 && isMounted) {
          setRouteCoordinates(osmRoute.path);
          setRouteDistance(`${osmRoute.distance} km`);
          setRouteDuration(osmRoute.duration);
          return;
        }
      } catch (err) {
        console.warn("Rider Map OSM routing failed:", err);
      }

      // 3. Fallback to city grid path
      if (isMounted) {
        const fallback = createGridFallbackPath(start, end);
        setRouteCoordinates(fallback);
        setRouteDistance("1.4 km");
        setRouteDuration(4);
      }
    };

    loadRoute();

    return () => {
      isMounted = false;
    };
  }, [selectedJob?.id, storeCoord.lat, storeCoord.lng, destLat, destLng]);

  // Derived progress-based coordinate interpolation
  const riderProgress = simulatedMapStep * 33.33;
  const interpolatedRiderPos = useMemo(() => {
    return routeCoordinates.length > 0
      ? interpolatePath(routeCoordinates, riderProgress)
      : {
          lat: storeCoord.lat + (destLat - storeCoord.lat) * (riderProgress / 100),
          lng: storeCoord.lng + (destLng - storeCoord.lng) * (riderProgress / 100)
        };
  }, [routeCoordinates, riderProgress, storeCoord, destLat, destLng]);

  // Render Google Maps (Rider View - Dark Mode)
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapContainerRef.current || !selectedJob) return;

    const google = (window as any).google;

    if (!googleMapInstanceRef.current) {
      const mapOptions = {
        center: storeCoord,
        zoom: 14,
        disableDefaultUI: true,
        styles: [
          { "elementType": "geometry", "stylers": [{ "color": "#1f2937" }] },
          { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1f2937" }] },
          { "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
          { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#10b981" }] },
          { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#10b981" }] },
          { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#111827" }] },
          { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#374151" }] },
          { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
          { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#312e81" }] },
          { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#030712" }] }
        ]
      };
      googleMapInstanceRef.current = new google.maps.Map(mapContainerRef.current, mapOptions);
    }

    const map = googleMapInstanceRef.current;

    // Set path or update polyline
    if (routeCoordinates && routeCoordinates.length > 0) {
      if (!googlePolylineRef.current) {
        googlePolylineRef.current = new google.maps.Polyline({
          path: routeCoordinates,
          geodesic: true,
          strokeColor: '#10b981', // Glowing green route line
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });
      } else {
        googlePolylineRef.current.setPath(routeCoordinates);
      }

      // Auto-fit bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(storeCoord);
      bounds.extend({ lat: destLat, lng: destLng });
      routeCoordinates.forEach(pt => bounds.extend(pt));
      map.fitBounds(bounds, { top: 35, bottom: 35, left: 35, right: 35 });
    }
  }, [isGoogleMapsLoaded, selectedJob?.id, storeCoord, destLat, destLng, routeCoordinates]);

  // Update Rider Marker on Google Maps
  useEffect(() => {
    if (!isGoogleMapsLoaded || !googleMapInstanceRef.current || !selectedJob) return;

    const google = (window as any).google;

    if (!googleRiderMarkerRef.current) {
      googleRiderMarkerRef.current = new google.maps.Marker({
        position: interpolatedRiderPos,
        map: googleMapInstanceRef.current,
        title: "Your Location",
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
              <circle cx="32" cy="32" r="30" fill="%2310b981" stroke="white" stroke-width="3" />
              <g transform="translate(14, 16)">
                <path d="M4 22h24l3-8H20" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="6" cy="22" r="4" fill="white"/>
                <circle cx="26" cy="22" r="4" fill="white"/>
                <rect x="2" y="10" width="8" height="8" rx="1" fill="white"/>
                <circle cx="17" cy="6" r="3" fill="white"/>
              </g>
            </svg>
          `),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18)
        }
      });
    } else {
      googleRiderMarkerRef.current.setPosition(interpolatedRiderPos);
    }
  }, [isGoogleMapsLoaded, interpolatedRiderPos, selectedJob?.id]);

  // Render Leaflet Map (Rider View - Dark Mode)
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current || !selectedJob || isGoogleMapsLoaded) return;

    const L = (window as any).L;

    if (!leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([storeCoord.lat, storeCoord.lng], 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(leafletMapInstanceRef.current);
    }

    const map = leafletMapInstanceRef.current;

    // Clear existing
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Add glowing green polyline
    if (routeCoordinates && routeCoordinates.length > 0) {
      const leafletPath = routeCoordinates.map(pt => [pt.lat, pt.lng]);
      L.polyline(leafletPath, {
        color: '#10b981',
        weight: 5,
        opacity: 0.95,
      }).addTo(map);

      const bounds = L.latLngBounds(leafletPath);
      bounds.extend([storeCoord.lat, storeCoord.lng]);
      bounds.extend([destLat, destLng]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // Add Rider Marker
    const riderIcon = L.divIcon({
      html: `<div class="bg-emerald-500 text-slate-950 p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center h-10 w-10"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-5 h-5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    leafletRiderMarkerRef.current = L.marker([interpolatedRiderPos.lat, interpolatedRiderPos.lng], { icon: riderIcon }).addTo(map);

  }, [isLeafletLoaded, isGoogleMapsLoaded, selectedJob?.id, storeCoord, destLat, destLng, routeCoordinates, interpolatedRiderPos]);

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

                  {/* HIGH-CONTRAST REAL INTERACTIVE GPS NAVIGATOR */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2.5xl overflow-hidden">
                    
                    <div className="bg-slate-950/90 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800/60">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase font-mono flex items-center gap-1.5">
                        <Compass size={11} className="animate-spin text-emerald-400" /> Live GPS Navigator
                      </span>
                      <span className="text-[10px] font-black text-emerald-400 font-mono">
                        {simulatedMapStep === 3 ? 'Arrived!' : `${remainingDist} km away • ${remainingTime} mins`}
                      </span>
                    </div>

                    {/* Interactive Dark-Mode Map Container */}
                    <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
                      
                      {/* Map Badges overlays */}
                      <div className="absolute top-3 left-3 bg-slate-900/95 border border-slate-800/90 px-2.5 py-1.5 rounded-xl shadow-md flex items-center space-x-1.5 z-[1000] pointer-events-none">
                        <ShoppingBag className="h-3 w-3 text-emerald-400" />
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider font-mono">HUB</span>
                      </div>

                      <div className="absolute bottom-3 right-3 bg-slate-900/95 border border-slate-800/90 px-2.5 py-1.5 rounded-xl shadow-md flex items-center space-x-1.5 z-[1000] pointer-events-none">
                        <MapPin className="h-3 w-3 text-red-400" />
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider font-mono">CUSTOMER</span>
                      </div>
                    </div>

                    {/* Active Navigation Instructions */}
                    <div className="bg-slate-900 px-4 py-3.5 border-t border-slate-800/60 flex items-center justify-between gap-3">
                      <div className="text-left leading-tight min-w-0 flex-1">
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block font-mono">NAVIGATING TO</span>
                        <span className="text-xs font-bold text-white block mt-0.5 truncate">{checkpoints[simulatedMapStep]?.label}</span>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{checkpoints[simulatedMapStep]?.desc}</p>
                      </div>

                      {/* Step Simulation driver button */}
                      {simulatedMapStep < 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalMapStep(prev => Math.min(3, prev + 1));
                            showToast("Moving to next checkpoint on map...");
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-extrabold text-[10px] px-3.5 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer shrink-0"
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
