import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { loadProfile } from "@/lib/store";
import { UserProfile } from "@/lib/types";
import { peruHospitals } from "@/lib/hospitals";
import { findNearbyHospitals, qaoaOptimize, estimateTravelTime } from "@/lib/qaoa";
import { sendEmergencyWebhook } from "@/lib/webhook";
import { predictDeliveryWindow } from "@/lib/riskPrediction";
import { Siren, MapPin, Clock, Navigation, CheckCircle, Loader2, Mail, Phone, Send, MessageCircle, Zap, Timer, Play, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const formatTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const Emergency = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lat, setLat] = useState(-12.046);
  const [lon, setLon] = useState(-77.043);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSent, setWebhookSent] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [emailsSent, setEmailsSent] = useState<string[]>([]);
  const [smsSent, setSmsSent] = useState<string[]>([]);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setTimerStarted(true);
    setTimerRunning(true);
    setTimerSeconds(0);
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLat(pos.coords.latitude); setLon(pos.coords.longitude); setLoading(false); },
        () => setLoading(false),
        { timeout: 5000 }
      );
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const nearby = useMemo(() => findNearbyHospitals(lat, lon, peruHospitals, 100), [lat, lon]);
  const [bestHospital, setBestHospital] = useState<ReturnType<typeof qaoaOptimize>>(null);

  const runQAOA = () => {
    setOptimizing(true);
    setTimeout(() => {
      const result = qaoaOptimize(lat, lon, nearby);
      setBestHospital(result);
      setOptimizing(false);
      setOptimized(true);
    }, 1500);
  };

  useEffect(() => {
    if (!loading && nearby.length > 0 && !optimized) runQAOA();
  }, [loading, nearby.length]);

  const travelTime = bestHospital ? estimateTravelTime(bestHospital.distance) : 0;
  const locationLink = `https://maps.google.com/?q=${lat},${lon}`;
  const directionsLink = bestHospital
    ? `https://www.google.com/maps/dir/${lat},${lon}/${bestHospital.hospital.latitude},${bestHospital.hospital.longitude}`
    : "#";
  const deliveryWindow = profile ? predictDeliveryWindow(profile) : "";

  const buildAlertMessage = () => {
    if (!profile || !bestHospital) return "";
    return `🚨 QUANTUMMOM EMERGENCY ALERT 🚨\n\n${profile.name} may be experiencing labour pain and has activated the QuantumMom emergency system.\n\n📍 Live Location:\n${locationLink}\n\n🗺️ Navigate to Hospital:\n${directionsLink}\n\n🏥 Nearest Hospital (QAOA Optimized):\n${bestHospital.hospital.name}\n\n📏 Distance: ${bestHospital.distance.toFixed(1)} km\n⏱️ Estimated Arrival: ${travelTime} minutes\n\n🍼 Estimated Delivery Window:\n${deliveryWindow}\n\n👶 Pregnancy Month: ${profile.pregnancyMonth}/9\n${timerStarted ? `\n⏲️ Contraction Timer: ${formatTimer(timerSeconds)}\n` : ""}\nPlease assist immediately. This is an automated emergency alert from QuantumMom.`;
  };

  const alertMessage = buildAlertMessage();

  const sendEmailAlert = (email: string, contactName: string) => {
    const subject = encodeURIComponent("🚨 QuantumMom Emergency Alert");
    const body = encodeURIComponent(alertMessage);
    window.open(`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`, "_blank");
    setEmailsSent((prev) => [...prev, email]);
  };

  const sendSMSAlert = (phone: string) => {
    const message = encodeURIComponent(alertMessage);
    window.open(`sms:${encodeURIComponent(phone)}?body=${message}`, "_blank");
    setSmsSent((prev) => [...prev, phone]);
  };

  const sendToAllContacts = () => {
    if (!profile) return;
    profile.emergencyContacts.forEach((c) => {
      if (c.email) sendEmailAlert(c.email, c.name);
    });
  };

  const handleSendWebhook = async () => {
    if (!profile || !bestHospital || !webhookUrl) return;
    setSendingWebhook(true);
    await sendEmergencyWebhook(webhookUrl, {
      name: profile.name,
      message: alertMessage,
      location: locationLink,
      hospital: bestHospital.hospital.name,
      distance: `${bestHospital.distance.toFixed(1)} km`,
      eta: `${travelTime} minutes`,
      emergency_contacts: profile.emergencyContacts.map((c) => ({ name: c.name, email: c.email, phone: c.phone })),
    });
    setSendingWebhook(false);
    setWebhookSent(true);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ===== EMERGENCY ACTIVATED HEADER with Map + Timer + Contacts ===== */}
      <div className="bg-emergency px-6 pt-6 pb-2 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-center gap-3">
          <Siren className="h-8 w-8 text-emergency-foreground animate-bounce" />
          <h1 className="font-display text-3xl font-extrabold text-emergency-foreground">EMERGENCY ACTIVATED</h1>
          <Siren className="h-8 w-8 text-emergency-foreground animate-bounce" />
        </motion.div>
        <p className="text-emergency-foreground/80 mt-1 mb-4">QAOA quantum optimization • Real-time tracking</p>
      </div>

      {/* Integrated Emergency Panel (inside the red zone) */}
      <div className="bg-emergency/5 border-b-2 border-emergency/20">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Column 1: Map Navigation */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
              <div className="card-medical border-2 border-emergency/20 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="h-5 w-5 text-emergency" />
                  <h2 className="font-display text-lg font-bold text-foreground">Map Navigation</h2>
                </div>

                {optimizing && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                    <p className="font-semibold text-foreground">Running QAOA...</p>
                    <p className="text-xs text-muted-foreground">Evaluating {nearby.length} hospitals</p>
                  </div>
                )}

                {optimized && bestHospital && (
                  <div className="space-y-3">
                    {/* Hospital info bar */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-success/10 border border-success/20 p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Hospital</p>
                        <p className="text-xs font-bold text-foreground truncate">⭐ {bestHospital.hospital.name}</p>
                      </div>
                      <div className="rounded-lg bg-info/10 border border-info/20 p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Distance</p>
                        <p className="text-sm font-bold text-foreground">{bestHospital.distance.toFixed(1)} km</p>
                      </div>
                      <div className="rounded-lg bg-warning/10 border border-warning/20 p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">ETA</p>
                        <p className="text-sm font-bold text-foreground">{travelTime} min</p>
                      </div>
                    </div>

                    {/* Map */}
                    <div className="rounded-xl overflow-hidden border border-border">
                      <iframe
                        title="Hospital Map"
                        width="100%"
                        height="260"
                        style={{ border: 0 }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.08}%2C${lat - 0.06}%2C${lon + 0.08}%2C${lat + 0.06}&layer=mapnik&marker=${lat}%2C${lon}`}
                      />
                    </div>

                    {/* Hospital list */}
                    <div className="space-y-1">
                      {nearby.slice(0, 4).map((h) => (
                        <div key={h.hospital.name} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${h.hospital.name === bestHospital.hospital.name ? "bg-success/15 border border-success/30 font-semibold" : "bg-muted/40"}`}>
                          <span className="text-foreground truncate mr-2">
                            {h.hospital.name === bestHospital.hospital.name ? "⭐ " : "🏥 "}{h.hospital.name}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap">{h.distance.toFixed(1)} km</span>
                        </div>
                      ))}
                    </div>

                    <a href={directionsLink} target="_blank" rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-primary-foreground font-bold text-sm hover:bg-primary/90 transition">
                      <Navigation className="h-4 w-4" /> Open Google Maps Navigation
                    </a>
                  </div>
                )}

                {!optimizing && !optimized && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Waiting for location data...</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Column 2: Timer + Quick Contacts */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

              {/* Contraction Timer */}
              <div className="card-medical border-2 border-emergency/20">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="h-5 w-5 text-emergency" />
                  <h2 className="font-display text-lg font-bold text-foreground">Contraction Timer</h2>
                </div>

                <div className="text-center py-4">
                  <motion.div
                    className={`inline-block rounded-2xl px-8 py-4 ${timerRunning ? "bg-emergency/10 border-2 border-emergency/30" : "bg-muted/50 border-2 border-border"}`}
                    animate={timerRunning ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <p className={`font-mono text-4xl font-extrabold ${timerRunning ? "text-emergency" : "text-foreground"}`}>
                      {formatTimer(timerSeconds)}
                    </p>
                    {timerStarted && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {timerRunning ? "Timer running..." : "Timer paused"}
                      </p>
                    )}
                  </motion.div>
                </div>

                {!timerStarted ? (
                  <Button onClick={startTimer} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90 py-5 text-base font-bold">
                    <Play className="h-5 w-5 mr-2" /> Start Timer
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    {timerRunning ? (
                      <Button onClick={stopTimer} className="flex-1 bg-muted text-foreground hover:bg-muted/80 py-4 font-bold">
                        <Square className="h-4 w-4 mr-1" /> Pause
                      </Button>
                    ) : (
                      <Button onClick={() => {
                        setTimerRunning(true);
                        timerRef.current = setInterval(() => setTimerSeconds((p) => p + 1), 1000);
                      }} className="flex-1 bg-emergency text-emergency-foreground hover:bg-emergency/90 py-4 font-bold">
                        <Play className="h-4 w-4 mr-1" /> Resume
                      </Button>
                    )}
                    <Button onClick={() => { stopTimer(); setTimerSeconds(0); setTimerStarted(false); }}
                      variant="outline" className="py-4 font-bold">Reset</Button>
                  </div>
                )}
              </div>

              {/* Quick Emergency Contacts */}
              <div className="card-medical border-2 border-emergency/20">
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="h-5 w-5 text-emergency" />
                  <h2 className="font-display text-base font-bold text-foreground">Emergency Contacts</h2>
                </div>
                <div className="space-y-2">
                  {profile.emergencyContacts.map((contact, i) => (
                    <div key={contact.id || i} className="rounded-lg border border-border bg-card p-3">
                      <p className="font-semibold text-foreground text-sm">{contact.name || `Contact ${i + 1}`}</p>
                      <p className="text-xs text-muted-foreground mb-2">{contact.relationship}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {contact.phone && (
                          <a href={`tel:${encodeURIComponent(contact.phone)}`}
                            className="inline-flex items-center gap-1 rounded-md bg-emergency text-emergency-foreground px-2.5 py-1 text-xs font-semibold hover:bg-emergency/90 transition">
                            <Phone className="h-3 w-3" /> Call
                          </a>
                        )}
                        {contact.email && (
                          <button onClick={() => sendEmailAlert(contact.email, contact.name)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${emailsSent.includes(contact.email) ? "bg-success text-success-foreground" : "bg-info text-info-foreground hover:bg-info/90"}`}>
                            {emailsSent.includes(contact.email) ? <><CheckCircle className="h-3 w-3" /> Sent</> : <><Mail className="h-3 w-3" /> Email</>}
                          </button>
                        )}
                        {contact.phone && (
                          <button onClick={() => sendSMSAlert(contact.phone)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${smsSent.includes(contact.phone) ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}>
                            {smsSent.includes(contact.phone) ? <><CheckCircle className="h-3 w-3" /> Sent</> : <><MessageCircle className="h-3 w-3" /> SMS</>}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={sendToAllContacts}
                  className="w-full mt-3 bg-emergency text-emergency-foreground hover:bg-emergency/90 py-4 font-bold">
                  <Send className="h-4 w-4 mr-2" /> Alert ALL Contacts
                </Button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Below: Location settings, Webhook, Back button */}
      <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        {/* Location */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-medical">
          <h2 className="font-display text-lg font-bold text-foreground mb-3">📍 Adjust Location</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-muted-foreground">Latitude</Label><Input type="number" step="0.001" value={lat} onChange={(e) => { setLat(+e.target.value); setOptimized(false); }} /></div>
            <div><Label className="text-muted-foreground">Longitude</Label><Input type="number" step="0.001" value={lon} onChange={(e) => { setLon(+e.target.value); setOptimized(false); }} /></div>
          </div>
          {!optimized && nearby.length > 0 && (
            <Button onClick={runQAOA} className="mt-3 bg-primary text-primary-foreground">Re-run QAOA Optimization</Button>
          )}
        </motion.div>

        {/* Alert Message Preview */}
        {optimized && bestHospital && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-medical">
            <h2 className="font-display text-lg font-bold text-foreground mb-3">📋 Alert Message Content</h2>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-sm text-foreground space-y-2 leading-relaxed max-h-64 overflow-y-auto">
                <p className="font-bold text-emergency">🚨 QUANTUMMOM EMERGENCY ALERT 🚨</p>
                <p>{profile.name} may be experiencing labour pain.</p>
                <div className="rounded-lg bg-card p-3 space-y-1.5">
                  <p>📍 <a href={locationLink} target="_blank" rel="noopener noreferrer" className="text-info underline">Live Location</a></p>
                  <p>🗺️ <a href={directionsLink} target="_blank" rel="noopener noreferrer" className="text-info underline">Navigate to Hospital</a></p>
                  <p>🏥 <span className="font-semibold">{bestHospital.hospital.name}</span></p>
                  <p>📏 Distance: {bestHospital.distance.toFixed(1)} km</p>
                  <p>⏱️ ETA: {travelTime} minutes</p>
                  <p>🍼 Delivery Window: {deliveryWindow}</p>
                  <p>👶 Pregnancy Month: {profile.pregnancyMonth}/9</p>
                  {timerStarted && <p>⏲️ Contraction Timer: {formatTimer(timerSeconds)}</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Make.com Webhook */}
        {optimized && bestHospital && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-medical">
            <h2 className="font-display text-lg font-bold text-foreground mb-3">⚡ Automated Alert via Make.com</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Connect a Make.com webhook to automate email/SMS alerts
            </p>
            <div className="flex gap-3">
              <Input placeholder="https://hook.make.com/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="flex-1" />
              <Button onClick={handleSendWebhook} disabled={!webhookUrl || sendingWebhook || webhookSent}
                className={webhookSent ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}>
                {sendingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : webhookSent ? <><CheckCircle className="h-4 w-4 mr-1" /> Sent!</> : "Send via Webhook"}
              </Button>
            </div>
            {webhookSent && <p className="text-sm text-success mt-2">✅ Alert sent to Make.com webhook!</p>}
          </motion.div>
        )}

        <div className="text-center pb-8">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>← Back to Dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default Emergency;
