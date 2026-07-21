import React, { useState } from 'react';
import { useApp } from './AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, ArrowRight, Sparkles, User, ShieldCheck, Truck, ArrowLeft, RefreshCw } from 'lucide-react';

export const PhoneAuthScreen: React.FC = () => {
  const { loginUser } = useApp();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'manager' | 'rider'>('customer');
  const [customName, setCustomName] = useState('');
  
  // OTP code digits (4 numbers)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // SMS Notification states
  const [showToast, setShowToast] = useState(false);
  const [activeOtp, setActiveOtp] = useState('1234');
  
  // Demo accounts data
  const demos = [
    {
      label: 'Customer Demo',
      phone: '9876543210',
      role: 'customer' as const,
      name: 'Rahul Patil',
      color: 'from-emerald-500 to-teal-600',
      icon: User,
      desc: 'Opens Zepto Storefront'
    },
    {
      label: 'Store Manager Demo',
      phone: '9999911111',
      role: 'manager' as const,
      name: 'Mehta Ji (Store Manager)',
      color: 'from-indigo-600 to-violet-700',
      icon: ShieldCheck,
      desc: 'Opens Inventory & Sales'
    },
    {
      label: 'Delivery Rider Demo',
      phone: '8888822222',
      role: 'rider' as const,
      name: 'Kunal Patil (Express Pilot)',
      color: 'from-amber-500 to-orange-600',
      icon: Truck,
      desc: 'Opens Rider Delivery Portal'
    }
  ];

  const handleDemoClick = (demo: typeof demos[0]) => {
    setPhoneNumber(demo.phone);
    setSelectedRole(demo.role);
    setCustomName(demo.name);
    setErrorMsg('');
    setOtpDigits(['', '', '', '']);
    
    // Generate dynamic OTP
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setActiveOtp(generated);
    setShowToast(true);
    setStep('otp');
  };

  const formatPhoneNumber = (val: string) => {
    // Keep only digits
    const cleaned = val.replace(/\D/g, '');
    return cleaned.slice(0, 10);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      triggerShake();
      return;
    }
    setErrorMsg('');
    // Clear OTP inputs on step change
    setOtpDigits(['', '', '', '']);
    
    // Generate dynamic OTP
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setActiveOtp(generated);
    setShowToast(true);
    setStep('otp');
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(0, 1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    setErrorMsg('');

    // Auto focus next input
    if (cleanVal !== '' && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpDigits[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredOtp = otpDigits.join('');
    
    if (enteredOtp.length !== 4) {
      setErrorMsg('Please enter the 4-digit verification PIN.');
      triggerShake();
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    // Simulate short network delay
    setTimeout(() => {
      setIsVerifying(false);
      if (enteredOtp === activeOtp) {
        // Success
        let finalName = customName.trim();
        if (!finalName) {
          if (phoneNumber === '9876543210') finalName = 'Rahul Patil';
          else if (phoneNumber === '9999911111') finalName = 'Mehta Ji (Store Manager)';
          else if (phoneNumber === '8888822222') finalName = 'Kunal Patil (Express Pilot)';
          else {
            finalName = `User (${phoneNumber.slice(-4)})`;
          }
        }
        
        setShowToast(false);
        loginUser(phoneNumber, selectedRole, finalName);
      } else {
        setErrorMsg('Invalid PIN. Access denied.');
        triggerShake();
      }
    }, 450);
  };

  const handleKeypadPress = (num: string) => {
    // Find first empty slot
    const firstEmptyIndex = otpDigits.findIndex(d => d === '');
    if (firstEmptyIndex !== -1) {
      handleOtpChange(firstEmptyIndex, num);
    }
  };

  const handleKeypadBackspace = () => {
    // Find last filled slot
    const lastFilledIndex = [...otpDigits].reverse().findIndex(d => d !== '');
    if (lastFilledIndex !== -1) {
      const actualIndex = 3 - lastFilledIndex;
      const newDigits = [...otpDigits];
      newDigits[actualIndex] = '';
      setOtpDigits(newDigits);
      setErrorMsg('');
      const prevInput = document.getElementById(`otp-input-${actualIndex}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleAutoFill = () => {
    setOtpDigits(activeOtp.split(''));
    setShowToast(false);
    
    // Auto-focus the last box
    setTimeout(() => {
      const lastInput = document.getElementById('otp-input-3');
      if (lastInput) lastInput.focus();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      
      {/* Dynamic SMS Notification Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            className="fixed top-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-slate-950 text-white p-4.5 rounded-2xl shadow-2xl border border-slate-800 z-55 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20 text-lg flex items-center justify-center shrink-0">
                  💬
                </div>
                <div>
                  <h4 className="text-[10px] font-black tracking-wider uppercase text-emerald-400">SMS from Navjeevan</h4>
                  <p className="text-xs text-slate-200 font-medium mt-0.5">
                    Your OTP for login is <span className="text-white font-black font-mono tracking-widest bg-slate-800/80 px-2 py-0.5 rounded text-sm select-all">{activeOtp}</span>
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowToast(false)}
                className="text-slate-500 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
              <button
                type="button"
                onClick={() => setShowToast(false)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleAutoFill}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/15 flex items-center gap-1 cursor-pointer"
              >
                ⚡ Auto-Fill OTP
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Decorative Top Accent Line */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

        {/* Content area */}
        <div className="p-8 space-y-6">
          
          {/* Brand Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-2 shadow-sm">
              <Sparkles size={12} className="mr-1 animate-spin" /> Navjeevan Plus
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Unified Portal Login
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Enter your mobile number to instantly verify and access your account
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Form */}
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  
                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                      Mobile Number (10 digits)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        +91
                      </div>
                      <input
                        id="login-phone-input"
                        type="tel"
                        required
                        placeholder="98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                        className="w-full text-sm font-bold bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl pl-14 pr-4 py-3.5 focus:outline-none transition-all duration-300 text-slate-800 tracking-widest"
                      />
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 h-4 w-4" />
                    </div>
                  </div>

                  {/* Custom Role Selector (for custom numbers) */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                      Log In As (For custom numbers)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('customer')}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          selectedRole === 'customer'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <User size={14} />
                        <span>Customer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('manager')}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          selectedRole === 'manager'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <ShieldCheck size={14} />
                        <span>Manager</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('rider')}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          selectedRole === 'rider'
                            ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Truck size={14} />
                        <span>Rider</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Name */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2.5 focus:outline-none transition-all text-slate-800"
                    />
                  </div>

                  {/* Send OTP button */}
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white text-xs font-black py-4 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Request Verification OTP</span>
                    <ArrowRight size={14} />
                  </button>

                </form>

                {/* Error Banner inside Form */}
                {errorMsg && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-700 text-xs font-bold text-center">
                    {errorMsg}
                  </div>
                )}

                {/* Presentation Demo Accounts Header */}
                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">
                      Quick Presenter Accounts
                    </span>
                  </div>
                </div>

                {/* Demo Accounts List */}
                <div className="space-y-2">
                  {demos.map((d) => {
                    const Icon = d.icon;
                    return (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => handleDemoClick(d)}
                        className="w-full text-left p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 bg-gradient-to-tr ${d.color} text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform duration-300`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <span className="block text-xs font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors">
                              {d.label}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-bold">
                              +91 {d.phone.slice(0, 5)} {d.phone.slice(5)} · {d.desc}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          Instant Demo
                        </span>
                      </button>
                    );
                  })}
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setErrorMsg('');
                    setShowToast(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Change Phone Number</span>
                </button>

                {/* Info */}
                <div className="bg-emerald-50 border border-emerald-100/50 rounded-2xl p-4 text-center space-y-1">
                  <span className="text-[9px] uppercase font-black text-emerald-800 tracking-wider block font-mono">
                    OTP Verification PIN sent to
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    +91 {phoneNumber.slice(0, 5)} {phoneNumber.slice(5)}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Please verify using the 4-digit PIN sent via SMS above.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  {/* Masked code boxes */}
                  <motion.div 
                    animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex justify-center gap-3"
                  >
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="password"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-14 h-14 text-center text-xl font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl focus:outline-none transition-all shadow-xs text-slate-800"
                        style={{ WebkitTextSecurity: 'disc' }}
                      />
                    ))}
                  </motion.div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeypadPress(num)}
                        className="h-11 bg-slate-50 hover:bg-slate-100 border border-slate-150/60 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleOtpChange(otpDigits.findIndex(d => d === '') === -1 ? 3 : Math.max(0, otpDigits.findIndex(d => d === '')), '0')}
                      className="h-11 bg-slate-50 hover:bg-slate-100 border border-slate-150/60 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors col-start-2"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleKeypadBackspace}
                      className="h-11 bg-slate-100 hover:bg-slate-200 border border-slate-150 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ⌫
                    </button>
                  </div>

                  {/* Buttons */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-4 rounded-2xl shadow-md shadow-emerald-600/10 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:bg-emerald-400"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Verifying PIN...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Verify & Open Portal</span>
                      </>
                    )}
                  </button>
                </form>

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-700 text-xs font-bold text-center"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};
