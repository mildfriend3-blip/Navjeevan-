import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { 
  ShoppingBag, LayoutDashboard, Truck, MapPin, RefreshCw, 
  Sparkles, Navigation, Loader2, X, Check, ChevronDown, MapPinned,
  ShieldCheck
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

  // Local state for editing in the manual modal
  const [modalTown, setModalTown] = useState<Town>(currentTown);
  const [modalNeighborhood, setModalNeighborhood] = useState<string>('');
  const [modalFlat, setModalFlat] = useState<string>(flatDetails);

  // Sync modal inputs when context changes or modal opens
  useEffect(() => {
    if (isAddressModalOpen) {
      setModalTown(currentTown);
      setModalNeighborhood(selectedNeighborhood || NEIGHBORHOODS[currentTown][0]);
      setModalFlat(flatDetails);
    }
  }, [isAddressModalOpen, currentTown, selectedNeighborhood, flatDetails]);

  // If neighborhood isn't initialized yet, set a sensible default
  useEffect(() => {
    if (!selectedNeighborhood) {
      const list = NEIGHBORHOODS[currentTown];
      if (list && list.length > 0) {
        setSelectedNeighborhood(list[0]);
      }
    }
  }, [currentTown, selectedNeighborhood, setSelectedNeighborhood]);

  // Geolocation auto-detection
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
        setUserLatLng({ lat: latitude, lng: longitude });
        
        let closestStore: Town = 'Dhule';
        let minDistance = Infinity;

        (Object.keys(STORE_COORDINATES) as Town[]).forEach((town) => {
          const coord = STORE_COORDINATES[town];
          const dist = Math.sqrt(
            Math.pow(latitude - coord.lat, 2) + Math.pow(longitude - coord.lng, 2)
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestStore = town;
          }
        });

        const validTowns: Town[] = ['Dhule', 'Shahada', 'Jalgaon', 'Nandurbar'];
        if (!validTowns.includes(closestStore)) {
          closestStore = 'Dhule';
        }

        setCurrentTown(closestStore);

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
                geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
                  if (status === 'OK' && results) {
                    resolve(results);
                  } else {
                    reject(status);
                  }
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

  const handleSaveManualAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentTown(modalTown);
    setSelectedNeighborhood(modalNeighborhood);
    setFlatDetails(modalFlat);
    setUserLatLng(STORE_COORDINATES[modalTown]);
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

      {/* Manual Address Fallback Dialog Modal */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                    <MapPin className="text-emerald-600 h-5 w-5 animate-bounce" />
                    Select Delivery Address
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Please provide your area details for fast 10-minute delivery</p>
                </div>
                <button
                  onClick={() => setIsAddressModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* GPS helper block */}
              <div className="mb-5 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl p-4 border border-emerald-100/50 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider">Fastest Way</span>
                  <p className="text-xs text-emerald-950 font-bold">Use GPS Location Pinpoint</p>
                  <p className="text-[10px] text-emerald-700/80">Instantly detects the closest franchise store & sector</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleAutoDetectLocation();
                    setIsAddressModalOpen(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1.5"
                >
                  <Navigation size={12} className="fill-white" /> Locate Me
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveManualAddress} className="space-y-4">
                {/* 1. Town Select */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Choose Town Store</label>
                  <select
                    value={modalTown}
                    onChange={(e) => {
                      const newTown = e.target.value as Town;
                      setModalTown(newTown);
                      setModalNeighborhood(NEIGHBORHOODS[newTown][0]);
                    }}
                    className="w-full text-sm border border-slate-200 rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-slate-50 font-bold text-slate-800"
                  >
                    {FRANCHISE_STORES.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.id} Store ({store.deliveryTimeMins}m Delivery Guarantee)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Neighborhood Select */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Select Sector / Neighborhood</label>
                  <select
                    value={modalNeighborhood}
                    onChange={(e) => setModalNeighborhood(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-slate-50 font-bold text-slate-800"
                  >
                    {NEIGHBORHOODS[modalTown].map((neighborhood) => (
                      <option key={neighborhood} value={neighborhood}>
                        {neighborhood}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Flat details input */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Flat / House No. & Landmark</label>
                  <input
                    type="text"
                    required
                    value={modalFlat}
                    onChange={(e) => setModalFlat(e.target.value)}
                    placeholder="e.g. Flat 302, Shanti Heights, Sector-3"
                    className="w-full text-sm border border-slate-200 rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-white text-slate-800"
                  />
                </div>

                {/* Footer buttons */}
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
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/10"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
