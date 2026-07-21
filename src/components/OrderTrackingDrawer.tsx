import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from './AppContext';
import { Town, Order } from '../types';
import { 
  MapPin, Clock, ChevronUp, ChevronDown, CheckCircle2, ShoppingBag, 
  Phone, Navigation, Sparkles, Timer, Check, Store, Bike, ArrowRight, X, AlertTriangle
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
        headers: { 'User-Agent': 'Navjeevan-Plus-App-Customer' }
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

export const OrderTrackingDrawer: React.FC = () => {
  const { 
    orders, 
    currentTown, 
    updateOrderStatus, 
    userLatLng, 
    activeOrders,
    isTrackingDrawerOpen: isOpen, 
    setIsTrackingDrawerOpen: setIsOpen,
    trackingOrderId,
    setTrackingOrderId,
    cart
  } = useApp();

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
  const activeOrder = useMemo(() => {
    if (trackingOrderId) {
      const found = orders.find(o => o.id === trackingOrderId);
      if (found) return found;
    }
    return activeOrders[0] || null;
  }, [orders, activeOrders, trackingOrderId]);

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
  const destLat = activeOrder?.customerLat || userLatLng?.lat || (storeCoord.lat - 0.006);
  const destLng = activeOrder?.customerLng || userLatLng?.lng || (storeCoord.lng + 0.006);

  const [routeCoordinates, setRouteCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [routeDistance, setRouteDistance] = useState<string>('1.4 km');
  const [routeDuration, setRouteDuration] = useState<number>(4);

  // Auto route calculation for Customer View
  useEffect(() => {
    if (!activeOrder) {
      setRouteCoordinates([]);
      return;
    }

    const start = storeCoord;
    const end = { lat: destLat, lng: destLng };
    let isMounted = true;

    const loadRoute = async () => {
      // 1. Try Google Directions
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
          console.warn("Customer Map Google directions failed, trying OSRM:", err);
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
        console.warn("Customer Map OSM routing failed:", err);
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
  }, [activeOrder?.id, storeCoord.lat, storeCoord.lng, destLat, destLng]);

  const riderLat = useMemo(() => {
    if (routeCoordinates.length > 0) {
      return interpolatePath(routeCoordinates, riderProgress).lat;
    }
    return storeCoord.lat + (destLat - storeCoord.lat) * (riderProgress / 100);
  }, [routeCoordinates, riderProgress, storeCoord.lat, destLat]);

  const riderLng = useMemo(() => {
    if (routeCoordinates.length > 0) {
      return interpolatePath(routeCoordinates, riderProgress).lng;
    }
    return storeCoord.lng + (destLng - storeCoord.lng) * (riderProgress / 100);
  }, [routeCoordinates, riderProgress, storeCoord.lng, destLng]);

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
            { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
            { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
            { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
            { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
            { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
            { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
            { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
            { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
            { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
            { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
            { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#b1d0e0" }] },
            { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
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

        // Rider Marker (Custom high-res scooter icon)
        const riderMarker = new google.maps.Marker({
          position: { lat: riderLat, lng: riderLng },
          map,
          title: "Delivery Rider",
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
                <circle cx="32" cy="32" r="30" fill="%23ea580c" stroke="white" stroke-width="3" />
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

        // Path Line (follow computed road coordinates)
        new google.maps.Polyline({
          path: routeCoordinates.length > 0 ? routeCoordinates : [storeCoord, { lat: destLat, lng: destLng }],
          geodesic: true,
          strokeColor: '#10b981',
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });

        // Auto-fit camera bounds so both store and customer pins are perfectly centered with padding
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(storeCoord);
        bounds.extend({ lat: destLat, lng: destLng });
        if (routeCoordinates && routeCoordinates.length > 0) {
          routeCoordinates.forEach(pt => bounds.extend(pt));
        }
        map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });

      } catch (err) {
        console.error("Error drawing Google Map:", err);
      }
    }
  }, [isGoogleMapsLoaded, storeCoord, destLat, destLng, riderLat, riderLng, isOpen, activeOrder, routeCoordinates]);

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

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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

          // Delivery Path (following road coordinates)
          const leafletPath = routeCoordinates.length > 0 ? routeCoordinates.map(pt => [pt.lat, pt.lng]) : [[storeCoord.lat, storeCoord.lng], [destLat, destLng]];
          L.polyline(leafletPath, {
            color: '#10b981',
            weight: 5,
            opacity: 0.9,
          }).addTo(map);

          // Rider Icon (Custom high-res scooter)
          const riderIcon = L.divIcon({
            html: `<div class="bg-orange-500 text-white p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center h-10 w-10"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-5 h-5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          const riderMarker = L.marker([riderLat, riderLng], { icon: riderIcon }).addTo(map);
          leafletRiderMarkerRef.current = riderMarker;

          // Auto-fit bounds
          const bounds = L.latLngBounds(leafletPath);
          bounds.extend([storeCoord.lat, storeCoord.lng]);
          bounds.extend([destLat, destLng]);
          map.fitBounds(bounds, { padding: [30, 30] });

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
  }, [isLeafletLoaded, storeCoord, destLat, destLng, riderLat, riderLng, isOpen, activeOrder, routeCoordinates]);

  if (!activeOrder) return null;

  // Active status formatters
  const statusLower = activeOrder.status.toLowerCase();
  const orderStatus = activeOrder.status.toUpperCase();
  const stepIndex = 
    statusLower === 'placed' ? 1 :
    ['preparing', 'accepted', 'packed'].includes(statusLower) ? 2 :
    ['dispatched', 'out-for-delivery', 'out_for_delivery'].includes(statusLower) ? 3 :
    statusLower === 'delivered' ? 4 : 1;

  // Dynamic remaining minutes based on rider progress
  const estimatedMin = statusLower === 'delivered' ? 0 : Math.max(1, Math.round(12 * (1 - riderProgress / 100)));

  return (
    <>
      {/* 1. STICKY FLOATING TRACKING PILL (WHEN MINIMIZED) */}
      {!isOpen && cart.length === 0 && statusLower !== 'delivered' && statusLower !== 'cancelled' && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5">
                <span>Order #{activeOrder.id.replace('NP-ORD-', '')}</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono tracking-normal">
                  {orderStatus === 'PLACED' ? 'Placed' :
                   (orderStatus === 'PREPARING' || orderStatus === 'ACCEPTED') ? 'Preparing' :
                   (orderStatus === 'DISPATCHED' || orderStatus === 'OUT-FOR-DELIVERY') ? 'On the way' : 'Delivered'}
                </span>
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                <Clock size={10} className="text-emerald-400" />
                <span>Arriving in <strong className="text-white">{estimatedMin} mins</strong> • Tap to view live route</span>
              </p>
            </div>
          </div>
          <div className="bg-emerald-600 p-2.5 rounded-xl text-white flex items-center justify-center shrink-0 hover:bg-emerald-500 transition-colors">
            <ChevronUp size={14} className="animate-pulse stroke-[3]" />
          </div>
        </motion.div>
      )}

      {/* 2. SLIDE-UP LIVE TRACKING DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/80 z-50 backdrop-blur-xs"
            />

            {/* Slider Sheet */}
            <motion.div
              id="live-tracking-drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-slate-50 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.2)] z-50 overflow-hidden max-w-2xl mx-auto border-t border-slate-200/50 flex flex-col h-[85vh] sm:h-[80vh]"
            >
              {/* Drawer Pull Tab */}
              <div 
                className="w-full flex justify-center py-3.5 cursor-pointer bg-white border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors"
                onClick={() => setIsOpen(false)}
                title="Minimize live tracking"
              >
                <div className="w-14 h-1.5 rounded-full bg-slate-200 hover:bg-slate-300 transition-all" />
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
                        {statusLower === 'delivered' ? 'Delivered Just Now' : estimatedMin > 0 ? `Arriving in ${estimatedMin} mins` : 'Arrived! Enjoy your food'}
                      </h2>
                    </div>
                    
                    {/* Minimize / Close Button */}
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-2.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all focus:outline-none"
                      title="Minimize live tracking"
                    >
                      <X className="h-5 w-5" />
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

                {/* Horizontal Card Slides for Multi-Order Switching */}
                {activeOrders.length > 1 && (
                  <div className="bg-slate-100/80 border-b border-slate-200/50 py-3">
                    <div className="px-5 sm:px-8 mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active Deliveries ({activeOrders.length})
                      </span>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Swipe to Track</span>
                    </div>
                    <div className="flex overflow-x-auto gap-3 px-5 sm:px-8 pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory">
                      {activeOrders.map((o) => {
                        const isSelected = o.id === activeOrder.id;
                        const oStatus = o.status.toUpperCase();
                        const oMinutes = oStatus === 'DELIVERED' ? 0 : Math.max(1, o.estimatedDeliveryTime || 8);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setTrackingOrderId(o.id)}
                            className={`snap-center text-left shrink-0 w-64 p-4 rounded-2xl border transition-all duration-300 ${
                              isSelected
                                ? 'bg-slate-900 border-slate-950 text-white shadow-xl scale-[1.01]'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-55 shadow-xs'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className={`text-[10px] font-bold font-mono ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                                #{o.id.replace('NP-ORD-', '')}
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isSelected 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {oStatus === 'PLACED' ? 'Placed' :
                                 (oStatus === 'PREPARING' || oStatus === 'ACCEPTED') ? 'Preparing' :
                                 (oStatus === 'DISPATCHED' || oStatus === 'OUT-FOR-DELIVERY') ? 'On Way' : 'Delivered'}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <p className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                {o.items.length} Item{o.items.length > 1 ? 's' : ''} • ₹{o.total}
                              </p>
                              <p className={`text-[10px] font-medium flex items-center gap-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                <Clock size={10} className={isSelected ? 'text-emerald-400' : 'text-emerald-500'} />
                                <span>Arriving in {oMinutes} mins</span>
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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

                {/* Cancel Order Card (Only available when Order Status is PLACED) */}
                {orderStatus === 'PLACED' && (
                  <div className="bg-red-50/70 border border-red-100/80 p-5 rounded-3xl mt-4 mx-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-red-600 animate-pulse" />
                        Cancel Order Anytime
                      </p>
                      <p className="text-slate-500 text-[11px] leading-normal font-bold">
                        Your order is currently placed. Store hasn't packed or accepted it yet. You can cancel it instantly with one tap.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateOrderStatus(activeOrder.id, 'cancelled');
                        setIsOpen(false);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition-all shadow-md shadow-red-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shrink-0"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}

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

                    {/* Step 4: Handed Over - Delivered */}
                    <div className="flex items-start space-x-4 relative">
                      <div className={`z-10 flex items-center justify-center h-9 w-9 rounded-full border-2 transition-all ${
                        stepIndex >= 4 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {stepIndex >= 4 ? <Check className="h-4.5 w-4.5 stroke-[3]" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-sans font-extrabold text-xs sm:text-sm ${stepIndex >= 4 ? 'text-slate-800' : 'text-slate-400'}`}>Handed Over - Delivered</p>
                          {stepIndex === 4 && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold font-sans">Delivered Just Now</span>}
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

                {/* Rate & Review or Dismiss buttons */}
                {statusLower === 'delivered' && (
                  <div className="bg-emerald-950 border border-emerald-900 p-5 rounded-3xl mt-4 mx-4 shadow-md text-center space-y-4">
                    <div>
                      <p className="text-sm font-black text-emerald-400">Delivered Successfully! 🎉</p>
                      <p className="text-emerald-200/80 text-[11px] leading-normal font-bold mt-1">
                        Rate your superfast delivery pilot and help us maintain fresh standards.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          alert("Thank you for your rating! ⭐⭐⭐⭐⭐");
                          setTrackingOrderId(null);
                          setIsOpen(false);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                      >
                        Rate & Review Order
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTrackingOrderId(null);
                          setIsOpen(false);
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3.5 rounded-2xl transition-all border border-slate-700 active:scale-95"
                      >
                        Dismiss Tracking
                      </button>
                    </div>
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
