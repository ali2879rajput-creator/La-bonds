import { useState, useCallback } from 'react';
import { Phone, PhoneOff, Calendar, ShieldCheck, MapPin, Clock, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveAPI } from './hooks/useLiveAPI';

interface AppointmentData {
  clientName: string;
  defendantName: string;
  jailLocation: string;
  appointmentTime: string;
}

export default function App() {
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const onAppointmentBooked = useCallback((data: AppointmentData) => {
    setAppointment(data);
    setShowConfirmation(true);
  }, []);

  const systemInstruction = `
    You are Chloe, the virtual assistant for "City of Angels Bail Bonds" in Los Angeles.
    You have a friendly, professional, and supportive American SoCal female personality.
    Your voice should be warm and clear.
    
    IMPORTANT: You are helping people in stressful situations (their loved ones are in jail). Be helpful, calm, and efficient.
    
    YOUR PROCESS:
    1. Greet them warmly and ask how you can help.
    2. Collect their name (the caller).
    3. Collect the name of the person in custody.
    4. Collect the location/jail name (must be in LA area, like Men's Central, Twin Towers, Van Nuys Jail, etc.).
    5. Ask for their preferred appointment time to meet a licensed agent at the jail or our office.
    
    Once you have all 4 pieces of information, tell them you are booking it now, then call the "bookAppointment" tool.
    After tool confirmation, reassure them that an agent will be notified immediately.
    
    PRICING: If asked, say standard rates in CA are 10%, but special discounts (8%) might apply for union members or military. The agent will confirm this during the meeting.
  `;

  const { start, stop, isConnected, isRecording, error } = useLiveAPI({
    systemInstruction,
    voiceName: "Zephyr", // Smooth female-leaning voice
    onAppointmentBooked
  });

  return (
    <div className="min-h-screen bg-[#050A15] text-white font-sans selection:bg-amber-500 selection:text-black">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            <ShieldCheck className="text-black" size={24} />
          </div>
          <div>
            <h1 className="font-bold tracking-tighter text-xl text-amber-500">CITY OF ANGELS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-60">24/7 LA Emergency Bail Bonds</p>
          </div>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-semibold uppercase tracking-widest opacity-70">
          <a href="#" className="hover:text-amber-500 transition-colors">Services</a>
          <a href="#" className="hover:text-amber-500 transition-colors">Locations</a>
          <a href="#" className="hover:text-amber-500 transition-colors">Legal Help</a>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block py-1 px-3 mb-6 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest font-bold text-amber-400">
            Los Angeles Professional Assistance
          </span>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
            Help is Just a <span className="text-amber-500">Voice Away.</span>
          </h2>
          <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            Locked up in LA? Don't wait. Talk to Chloe, our AI bail assistant. 
            She can answer questions and book an immediate appointment with an agent.
          </p>

          <div className="flex flex-col items-center">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            <div className="relative group">
              <AnimatePresence>
                {(isConnected || isRecording) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute -inset-8 bg-amber-500/20 blur-3xl rounded-full pointer-events-none"
                  >
                    <div className="w-full h-full animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                id="voice-toggle-btn"
                onClick={isConnected ? stop : start}
                className={`
                  relative z-20 w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl
                  ${isConnected 
                    ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/30' 
                    : 'bg-amber-500 hover:bg-amber-400 hover:scale-105 shadow-amber-500/40'
                  }
                `}
              >
                {isConnected ? (
                  <PhoneOff size={44} className="text-white" />
                ) : (
                  <Phone size={44} className="text-black" />
                )}
              </button>

              <div className="mt-8">
                <p className={`text-sm font-bold uppercase tracking-widest transition-colors ${isConnected ? 'text-amber-500' : 'text-white/40'}`}>
                  {isConnected ? 'Agent Connected - Speaking' : 'Click to talk to Chloe'}
                </p>
                {isConnected && (
                  <div className="flex justify-center gap-1 mt-4 h-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [8, 16, 8] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                        className="w-1.5 bg-amber-500 rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && appointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-[#050A15]/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar size={32} />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">Appointment Secured</h3>
              <p className="text-white/50 text-center mb-8 text-sm">
                Chloe has logged your request. A licensed bondsman is being dispatched to confirm details.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                  <User className="text-amber-500" size={18} />
                  <div>
                    <p className="text-[10px] uppercase tracking-tighter opacity-50">Client / Contact</p>
                    <p className="text-sm font-semibold">{appointment.clientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                  <ShieldCheck className="text-amber-500" size={18} />
                  <div>
                    <p className="text-[10px] uppercase tracking-tighter opacity-50">Defendant</p>
                    <p className="text-sm font-semibold">{appointment.defendantName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                  <MapPin className="text-amber-500" size={18} />
                  <div>
                    <p className="text-[10px] uppercase tracking-tighter opacity-50">Jail Location</p>
                    <p className="text-sm font-semibold">{appointment.jailLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                  <Clock className="text-amber-500" size={18} />
                  <div>
                    <p className="text-[10px] uppercase tracking-tighter opacity-50">Requested Time</p>
                    <p className="text-sm font-semibold">{appointment.appointmentTime}</p>
                  </div>
                </div>
              </div>

              <button
                id="close-confirmation-btn"
                onClick={() => setShowConfirmation(false)}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-[0_5px_20px_rgba(245,158,11,0.3)]"
              >
                Got it, Thank you
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 py-12 border-t border-white/5 bg-black/20 text-center px-6">
        <p className="text-[10px] uppercase tracking-[0.4em] opacity-40 mb-2">Licensed in the State of California</p>
        <p className="text-xs opacity-60">© 2026 City of Angels Bail Bonds. All Rights Reserved. 1-800-ANGELS-LA</p>
      </footer>
    </div>
  );
}
