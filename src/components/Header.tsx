import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { 
  ShoppingBag, LayoutDashboard, Truck, MapPin, RefreshCw, 
  Sparkles, Navigation, Loader2, X, Check, ChevronDown, MapPinned,
  ShieldCheck, Search, Building2, Tag, Home, Briefcase, HelpCircle
} from 'lucide-react';
import { FRANCHISE_STORES } from '../data/initialData';
import { Town } from '../types';
import { motion, AnimatePresence } from 'motion/react';

// Copy of neighborhoods for easy lookup in the fallback selector
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

const STORE_COORDINATES: Record<Town, { lat: number; lng: number }> = {
  Jalgaon: { lat: 21.0077, lng: 75.5626 },
  Shahada: { lat: 21.5034, lng: 74.4739 },
  Nandurbar: { lat: 21.3687, lng: 74.2384 },
  Dhule: { lat: 20.9042, lng: 74.7749 }
};

export const Header: React.FC = () => {
  const { 
    activeRole, setActiveRole, 
    currentUser, logoutUser,
    currentTown, setCurrentTown, 
    selectedNeighborhood, setSelectedNeighborhood,
    flatDetails, setFlatDetails,
    resetAllData,
    userLatLng, setUserLatLng
  } = useApp();

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Expanded local states for Pin-On-Map sub-fields
  const [houseNo, setHouseNo] = useState('');
  const [buildingName, setModalBuildingName] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressTag, setAddressTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Map state and loaded flags
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState('');
  const [pinnedLatLng, setPinnedLatLng] = useState<{ lat: number; lng: number }>(STORE_COORDINATES.Dhule);

  // Search autocomplete states for Leaflet fallback
  const [searchQuery, setSearchQuery] = useState('');
  const [osmResults, setOsmResults] = useState<any[]>([]);
  const [isSearchingOsm, setIsSearchingOsm] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const leafletMapInstanceRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Simple copy of currentTown state to keep template happy
  const [modalTown, setModalTown] = useState<Town>(currentTown);

  // Nearest hub matching by geographic distance
  const getNearestTown = (lat: number, lng: number): Town => {
    let closestStore: Town = 'Dhule';
    let minDistance = Infinity;

    (Object.keys(STORE_COORDINATES) as Town[]).forEach((town) => {
      const coord = STORE_COORDINATES[town];
      const dist = Math.sqrt(
        Math.pow(lat - coord.lat, 2) + Math.pow(lng - coord.lng, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestStore = town;
      }
    });
    return closestStore;
  };

  // Safe loader for Google Maps vs Leaflet JS
  useEffect(() => {
    if (!isAddressModalOpen) return;

    const API_KEY =
      (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      '';

    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
      if ((window as any).google && (window as any).google.maps) {
        setIsGoogleMapsLoaded(true);
      } else {
        const scriptId = 'google-maps-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => setIsGoogleMapsLoaded(true);
          script.onerror = () => {
            console.warn("Failed to load Google Maps, falling back to Leaflet.");
            loadLeaflet();
          };
          document.head.appendChild(script);
        } else {
          const handler = () => setIsGoogleMapsLoaded(true);
          script.addEventListener('load', handler);
          return () => script.removeEventListener('load', handler);
        }
      }
    } else {
      loadLeaflet();
    }

    function loadLeaflet() {
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
  }, [isAddressModalOpen]);

  // Reverse geocoding implementation
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    let addressFound = '';

    // Try Google Maps Geocoder
    if ((window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const results = await new Promise<any>((resolve, reject) => {
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results) resolve(results);
            else reject(status);
          });
        });
        if (results && results[0]) {
          addressFound = results[0].formatted_address;
        }
      } catch (err) {
        console.warn("Google reverse geocoding failed, trying Nominatim fallback:", err);
      }
    }

    // Try Nominatim reverse geocode
    if (!addressFound) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'Navjeevan-Plus-App'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            addressFound = data.display_name;
          }
        }
      } catch (err) {
        console.error("Nominatim reverse geocoding failed:", err);
      }
    }

    setIsReverseGeocoding(false);
    if (addressFound) {
      setGeocodedAddress(addressFound);
      setModalBuildingName(addressFound);
    }
  };

  // Google Map Initialization & Event hook
  useEffect(() => {
    if (!isAddressModalOpen || !isGoogleMapsLoaded || !mapRef.current) return;

    const initialCenter = userLatLng || STORE_COORDINATES[currentTown] || STORE_COORDINATES.Dhule;
    setPinnedLatLng(initialCenter);

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
    });

    googleMapInstanceRef.current = map;

    // Run initial reverse geocode
    reverseGeocode(initialCenter.lat, initialCenter.lng);
    const nearest = getNearestTown(initialCenter.lat, initialCenter.lng);
    setModalTown(nearest);

    // Map idle (dragging complete) listener
    map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) {
        const lat = center.lat();
        const lng = center.lng();
        reverseGeocode(lat, lng);
        const nearest = getNearestTown(lat, lng);
        setModalTown(nearest);
        setPinnedLatLng({ lat, lng });
      }
    });

    // Setup autocomplete places input
    if (searchInputRef.current) {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode', 'establishment'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const location = place.geometry.location;
          map.setCenter(location);
          map.setZoom(17);
          const lat = location.lat();
          const lng = location.lng();
          reverseGeocode(lat, lng);
          const nearest = getNearestTown(lat, lng);
          setModalTown(nearest);
          setPinnedLatLng({ lat, lng });
          setSearchQuery(place.formatted_address || '');
        }
      });
    }

    return () => {
      googleMapInstanceRef.current = null;
    };
  }, [isAddressModalOpen, isGoogleMapsLoaded]);

  // Leaflet Map Fallback Initialization
  useEffect(() => {
    if (!isAddressModalOpen || !isLeafletLoaded || !mapRef.current || isGoogleMapsLoaded) return;

    const initialCenter = userLatLng || STORE_COORDINATES[currentTown] || STORE_COORDINATES.Dhule;
    setPinnedLatLng(initialCenter);
    const L = (window as any).L;

    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.remove();
      leafletMapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    leafletMapInstanceRef.current = map;

    // Run initial reverse geocode
    reverseGeocode(initialCenter.lat, initialCenter.lng);
    const nearest = getNearestTown(initialCenter.lat, initialCenter.lng);
    setModalTown(nearest);

    // Leaflet drag/moveend event listener
    map.on('moveend', () => {
      const center = map.getCenter();
      if (center) {
        const lat = center.lat;
        const lng = center.lng;
        reverseGeocode(lat, lng);
        const nearest = getNearestTown(lat, lng);
        setModalTown(nearest);
        setPinnedLatLng({ lat, lng });
      }
    });

    return () => {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }
    };
  }, [isAddressModalOpen, isLeafletLoaded, isGoogleMapsLoaded]);

  // OSM Search suggestions fetcher
  const handleOsmSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setOsmResults([]);
      return;
    }
    setIsSearchingOsm(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Navjeevan-Plus-App'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setOsmResults(data || []);
      }
    } catch (err) {
      console.error("OSM Search failed:", err);
    } finally {
      setIsSearchingOsm(false);
    }
  };

  // Populate sub-fields when address modal opens or context details change
  useEffect(() => {
    if (isAddressModalOpen) {
      const initialLatLng = userLatLng || STORE_COORDINATES[currentTown] || STORE_COORDINATES.Dhule;
      setPinnedLatLng(initialLatLng);

      let tag: 'Home' | 'Work' | 'Other' = 'Home';
      let remaining = flatDetails;
      if (flatDetails.includes('[Home]')) {
        tag = 'Home';
        remaining = flatDetails.replace('[Home]', '').trim();
      } else if (flatDetails.includes('[Work]')) {
        tag = 'Work';
        remaining = flatDetails.replace('[Work]', '').trim();
      } else if (flatDetails.includes('[Other]')) {
        tag = 'Other';
        remaining = flatDetails.replace('[Other]', '').trim();
      }
      setAddressTag(tag);

      let house = remaining;
      let near = '';
      if (remaining.includes(', Near ')) {
        const parts = remaining.split(', Near ');
        house = parts[0];
        near = parts[1];
      }
      setHouseNo(house || '');
      setLandmark(near || '');
      setModalBuildingName(selectedNeighborhood || '');
      setSearchQuery(selectedNeighborhood || '');
    }
  }, [isAddressModalOpen]);

  // Handle auto-detect location via geolocation
  const handleAutoDetectLocation = () => {
    const API_KEY =
      (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      '';

    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      setDetectStatus('error');
      setIsAddressModalOpen(true);
      return;
    }

    setIsDetecting(true);
    setDetectStatus('idle');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setUserLatLng(coords);
        setPinnedLatLng(coords);
        
        const closestStore = getNearestTown(latitude, longitude);
        setCurrentTown(closestStore);
        setModalTown(closestStore);

        let detectedStreet = '';
        let detectedCity = '';
        let detectedPincode = '';
        let geocodeSuccess = false;

        if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
          try {
            const loaded = await new Promise<boolean>((resolve) => {
              if ((window as any).google && (window as any).google.maps) {
                resolve(true);
                return;
              }
              const scriptId = 'google-maps-script';
              let script = document.getElementById(scriptId) as HTMLScriptElement;
              if (script) {
                script.addEventListener('load', () => resolve(true));
                script.addEventListener('error', () => resolve(false));
                return;
              }
              script = document.createElement('script');
              script.id = scriptId;
              script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
              script.async = true;
              script.defer = true;
              script.onload = () => resolve(true);
              script.onerror = () => resolve(false);
              document.head.appendChild(script);
            });

            if (loaded && (window as any).google?.maps?.Geocoder) {
              const geocoder = new (window as any).google.maps.Geocoder();
              const response = await new Promise<any>((resolve, reject) => {
                geocoder.geocode({ location: coords }, (results: any, status: any) => {
                  if (status === 'OK' && results) resolve(results);
                  else reject(status);
                });
              });

              if (response && response[0]) {
                const result = response[0];
                detectedStreet = result.formatted_address;
                for (const component of result.address_components) {
                  if (component.types.includes('postal_code')) {
                    detectedPincode = component.long_name;
                  }
                  if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                    detectedCity = component.long_name;
                  }
                  if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
                    detectedStreet = component.long_name;
                  }
                }
                geocodeSuccess = true;
              }
            }
          } catch (err) {
            console.warn("Google Geocoding failed, falling back to OSM Nominatim:", err);
          }
        }

        if (!geocodeSuccess) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              {
                headers: {
                  'Accept-Language': 'en',
                  'User-Agent': 'Navjeevan-Plus-App'
                }
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (data && data.address) {
                const addr = data.address;
                detectedStreet = addr.suburb || addr.neighbourhood || addr.road || addr.village || addr.county || 'Detected Area';
                detectedCity = addr.city || addr.town || addr.village || closestStore;
                detectedPincode = addr.postcode || '';
                geocodeSuccess = true;
              }
            }
          } catch (err) {
            console.error("OSM Geocoding failed:", err);
          }
        }

        if (geocodeSuccess) {
          setSelectedNeighborhood(detectedStreet || 'Detected Sector');
          setFlatDetails(`Flat 301, Near Landmark (${detectedCity}${detectedPincode ? ' - ' + detectedPincode : ''})`);
          setDetectStatus('success');
        } else {
          const neighborhoods = NEIGHBORHOODS[closestStore] || NEIGHBORHOODS['Dhule'];
          const randomIdx = Math.floor(Math.random() * neighborhoods.length);
          const autoNeighborhood = neighborhoods[randomIdx];
          setSelectedNeighborhood(autoNeighborhood);
          setFlatDetails('Flat 301, GPS Detected Area');
          setDetectStatus('success');
        }

        setIsDetecting(false);
        setTimeout(() => setDetectStatus('idle'), 4000);
      },
      (error) => {
        const fallbackTown: Town = 'Dhule';
        setCurrentTown(fallbackTown);
        const neighborhoods = NEIGHBORHOODS[fallbackTown];
        setSelectedNeighborhood(neighborhoods[0]);
        setFlatDetails('Flat 301, Default Area (GPS Bypass)');
        setUserLatLng(STORE_COORDINATES[fallbackTown]);
        
        setDetectStatus('success');
        setIsDetecting(false);
        setIsAddressModalOpen(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Save manual geocoded & detailed address
  const handleSaveManualAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTown = getNearestTown(pinnedLatLng.lat, pinnedLatLng.lng);
    setCurrentTown(finalTown);

    const finalFlat = `${houseNo}${landmark ? `, Near ${landmark}` : ''} [${addressTag}]`;
    const finalNeighborhood = buildingName || geocodedAddress || 'Pinned Location';

    setSelectedNeighborhood(finalNeighborhood);
    setFlatDetails(finalFlat);
    setUserLatLng(pinnedLatLng);
    setIsAddressModalOpen(false);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-3.5 lg:h-20 gap-4">
            
            {/* Left Column: Brand & Quick-Commerce Identity */}
            <div className="flex items-center justify-between lg:justify-start gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-200/50 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="font-extrabold text-2xl tracking-tight text-slate-800">Navjeevan</span>
                    <span className="font-black text-2xl text-emerald-600 ml-1">Plus</span>
                    <span className="ml-2 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5 fill-slate-950" /> 10-Min
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase block mt-0.5">Zepto Quick Commerce</span>
                </div>
              </div>
            </div>

            {/* Middle Column: Interactive Geolocation & Address Pills */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Geolocation Selector Button Pill */}
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-100 hover:bg-emerald-100/50 px-4 py-2.5 rounded-full text-left transition-all duration-300 shadow-xs group"
              >
                <MapPinned className="h-4.5 w-4.5 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <span className="block text-[9px] uppercase font-bold text-emerald-800 tracking-wider font-mono">Delivering To</span>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                    {currentTown}
                    {selectedNeighborhood ? ` (${selectedNeighborhood})` : ''}
                    <ChevronDown size={12} className="text-emerald-600" />
                  </span>
                </div>
              </button>

              {/* Auto-Detect Button */}
              <button
                onClick={handleAutoDetectLocation}
                disabled={isDetecting}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-300 ${
                  detectStatus === 'success'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                    : detectStatus === 'error'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400/60 hover:bg-emerald-50/20'
                }`}
                title="Use Browser Geolocation API to auto-select regional store"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : detectStatus === 'success' ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>GPS Sync!</span>
                  </>
                ) : (
                  <>
                    <Navigation className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
                    <span>Auto-Detect</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: User profile pill & Logout button */}
            <div className="flex items-center justify-end gap-3 min-w-[200px]">
              {currentUser && (
                <>
                  {/* User Profile Pill & Role Badge */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2.5 pr-3.5 py-1.5 rounded-full shadow-2xs">
                    <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs uppercase shadow-xs">
                      {currentUser.name.slice(0, 1) || 'U'}
                    </div>
                    <div className="text-left leading-tight">
                      <span className="block text-[11px] font-black text-slate-800 tracking-tight max-w-[100px] truncate">
                        {currentUser.name}
                      </span>
                      <span className={`inline-flex text-[9px] font-black font-mono uppercase px-1 rounded mt-0.5 ${
                        currentUser.role === 'manager'
                          ? 'bg-indigo-500/10 text-indigo-700'
                          : currentUser.role === 'rider'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-emerald-500/10 text-emerald-700'
                      }`}>
                        {currentUser.role === 'manager' ? 'Manager' : currentUser.role === 'rider' ? 'Rider' : 'Customer'}
                      </span>
                    </div>
                  </div>

                  {/* Switch User / Logout Button */}
                  <button
                    onClick={() => logoutUser()}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-100 rounded-xl transition-all duration-300 cursor-pointer shadow-2xs"
                    title="Switch User / Logout"
                  >
                    <RefreshCw size={11} className="animate-pulse" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Zepto-Style Pin-on-Map Location Picker Modal */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <MapPin className="text-emerald-600 h-5 w-5 animate-bounce" />
                    Pin Location on Map
                  </h3>
                  <p className="text-[11px] text-slate-500">Drag map or search to match nearest 10-Min store</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                
                {/* Search Bar / Places Autocomplete Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search size={16} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search society, building name, street or area..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!isGoogleMapsLoaded) {
                        handleOsmSearch(e.target.value);
                      }
                    }}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-2xl pl-10 pr-10 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-slate-50 font-bold text-slate-800 shadow-2xs placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setOsmResults([]);
                      }}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {/* Nominatim Fallback Suggestion Dropdown */}
                  {!isGoogleMapsLoaded && osmResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-1 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-[2000] divide-y divide-slate-100">
                      {osmResults.map((res, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            const lat = parseFloat(res.lat);
                            const lng = parseFloat(res.lon);
                            setSearchQuery(res.display_name);
                            setOsmResults([]);
                            
                            // Move fallback map
                            if (leafletMapInstanceRef.current) {
                              leafletMapInstanceRef.current.setView([lat, lng], 16);
                            }
                            reverseGeocode(lat, lng);
                            const nearest = getNearestTown(lat, lng);
                            setModalTown(nearest);
                            setPinnedLatLng({ lat, lng });
                          }}
                          className="w-full text-left px-4 py-3 text-xs hover:bg-emerald-50/40 text-slate-700 font-bold leading-normal flex items-start gap-2 transition-colors"
                        >
                          <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{res.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Map View & Custom Central Pin */}
                <div className="relative w-full h-[180px] sm:h-[220px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                  <div ref={mapRef} className="w-full h-full" />
                  
                  {/* Central Overlay Target Pin (Like Swiggy/Zepto) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
                    <div className="flex flex-col items-center -translate-y-[20px]">
                      <div className={`bg-emerald-600 text-white p-2.5 rounded-full shadow-xl border-2 border-white flex items-center justify-center h-10 w-10 ${isReverseGeocoding ? 'animate-bounce' : ''}`}>
                        <MapPin size={20} className="text-white fill-white" />
                      </div>
                      <div className="w-2.5 h-1.5 bg-slate-900/40 rounded-full blur-[1px] mt-0.5" />
                    </div>
                  </div>

                  {/* Locate Me Snapper Overlay */}
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const { latitude, longitude } = pos.coords;
                          const target = { lat: latitude, lng: longitude };
                          setPinnedLatLng(target);
                          if (isGoogleMapsLoaded && googleMapInstanceRef.current) {
                            googleMapInstanceRef.current.setCenter(target);
                          } else if (leafletMapInstanceRef.current) {
                            leafletMapInstanceRef.current.setView([latitude, longitude], 16);
                          }
                          reverseGeocode(latitude, longitude);
                          const nearest = getNearestTown(latitude, longitude);
                          setModalTown(nearest);
                        });
                      }
                    }}
                    className="absolute bottom-3 right-3 bg-white hover:bg-slate-50 text-slate-800 hover:text-emerald-600 font-bold text-[10px] px-3 py-2 rounded-xl transition-all shadow-md border border-slate-100 flex items-center gap-1 z-[999]"
                  >
                    <Navigation size={10} className="fill-emerald-600 text-emerald-600" />
                    <span>Locate Me</span>
                  </button>
                </div>

                {/* Current geocoded feedback */}
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl flex items-start gap-3">
                  <div className="bg-emerald-500 text-white p-2 rounded-xl flex items-center justify-center shrink-0">
                    <MapPinned size={15} />
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="text-[9px] uppercase font-black text-emerald-800 tracking-wider">Pinned Street Location</span>
                    <p className="text-xs text-slate-800 font-bold truncate">
                      {isReverseGeocoding ? (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Loader2 size={11} className="animate-spin text-emerald-600" />
                          Geocoding coordinates...
                        </span>
                      ) : (
                        geocodedAddress || 'Drag map to select location'
                      )}
                    </p>
                  </div>
                </div>

                {/* Main Form Fields */}
                <form onSubmit={handleSaveManualAddress} className="space-y-4">
                  {/* Detailed Input Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    {/* House No */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        House / Flat / Floor No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={houseNo}
                        onChange={(e) => setHouseNo(e.target.value)}
                        placeholder="e.g. Flat 402, 4th Floor"
                        className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Nearby Landmark */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Nearby Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Next to ICICI ATM"
                        className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Apartment / Building Name */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Apartment / Building Name & Street <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={buildingName}
                      onChange={(e) => setModalBuildingName(e.target.value)}
                      placeholder="e.g. Shanti Heights, Sakri Road"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-slate-50 font-bold text-slate-800 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Save Address As Toggle Pills */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Save Address As
                    </label>
                    <div className="flex gap-2.5">
                      {[
                        { id: 'Home', icon: Home, label: 'Home' },
                        { id: 'Work', icon: Briefcase, label: 'Work' },
                        { id: 'Other', icon: Tag, label: 'Other' }
                      ].map((tagItem) => {
                        const IconComponent = tagItem.icon;
                        const isSelected = addressTag === tagItem.id;
                        return (
                          <button
                            key={tagItem.id}
                            type="button"
                            onClick={() => setAddressTag(tagItem.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <IconComponent size={13} />
                            <span>{tagItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Distance auto-matched hub warning */}
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-emerald-600 animate-pulse" />
                      <span>Delivery Store matching nearest GPS coordinate:</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-black font-mono">
                      {getNearestTown(pinnedLatLng.lat, pinnedLatLng.lng)} Hub
                    </span>
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100 mt-5">
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/10 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      Confirm & Save Address
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
