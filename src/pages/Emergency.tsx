import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { loadProfile } from "@/lib/store";
import { UserProfile } from "@/lib/types";
import { peruHospitals } from "@/lib/hospitals";
import { findNearbyHospitals, qaoaOptimize, estimateTravelTime } from "@/lib/qaoa";
import { sendEmergencyWebhook } from "@/lib/webhook";
import { predictDeliveryWindow } from "@/lib/riskPrediction";
import { Siren, MapPin, Clock, Navigation, CheckCircle, AlertTriangle, Loader2, Mail, Phone, Send, MessageCircle, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

  // Build alert message
  const buildAlertMessage = () => {
    if (!profile || !bestHospital) return "";
    return `🚨 QUANTUMMOM EMERGENCY ALERT 🚨

${profile.name} may be experiencing labour pain and has activated the QuantumMom emergency system.

📍 Live Location:
${locationLink}

🗺️ Navigate to Hospital:
${directionsLink}

🏥 Nearest Hospital (QAOA Optimized):
${bestHospital.hospital.name}

📏 Distance: ${bestHospital.distance.toFixed(1)} km
⏱️ Estimated Arrival: ${travelTime} minutes

🍼 Estimated Delivery Window:
${deliveryWindow}

👶 Pregnancy Month: ${profile.pregnancyMonth}/9

Please assist immediately. This is an automated emergency alert from QuantumMom.`;
  };

  const alertMessage = buildAlertMessage();

  // Send email to a contact
  const sendEmailAlert = (email: string, contactName: string) => {
    const subject = encodeURIComponent("🚨 QuantumMom Emergency Alert");
    const body = encodeURIComponent(alertMessage);
    window.open(`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`, "_blank");
    setEmailsSent((prev) => [...prev, email]);
  };

  // Send SMS/WhatsApp to a contact
  const sendSMSAlert = (phone: string) => {
    const message = encodeURIComponent(alertMessage);
    // Try SMS first
    window.open(`sms:${encodeURIComponent(phone)}?body=${message}`, "_blank");
    setSmsSent((prev) => [...prev, phone]);
  };

  // Send to all contacts
  const sendToAllContacts = () => {
    if (!profile) return;
    profile.emergencyContacts.forEach((c) => {
      if (c.email) sendEmailAlert(c.email, c.name);
    });
  };

  // Webhook handler
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
      {/* Alert header */}
      <div className="bg-emergency px-6 py-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-center gap-3">
          <Siren className="h-8 w-8 text-emergency-foreground animate-bounce" />
          <h1 className="font-display text-3xl font-extrabold text-emergency-foreground">EMERGENCY ACTIVATED</h1>
          <Siren className="h-8 w-8 text-emergency-foreground animate-bounce" />
        </motion.div>
        <p className="text-emergency-foreground/80 mt-1">Finding optimal hospital using QAOA quantum optimization</p>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        {/* Location */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-medical">
          <h2 className="font-display text-lg font-bold text-foreground mb-3">📍 Your Location</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-muted-foreground">Latitude</Label><Input type="number" step="0.001" value={lat} onChange={(e) => { setLat(+e.target.value); setOptimized(false); }} /></div>
            <div><Label className="text-muted-foreground">Longitude</Label><Input type="number" step="0.001" value={lon} onChange={(e) => { setLon(+e.target.value); setOptimized(false); }} /></div>
          </div>
          {!optimized && nearby.length > 0 && (
            <Button onClick={runQAOA} className="mt-3 bg-primary text-primary-foreground">Re-run QAOA Optimization</Button>
          )}
        </motion.div>

        {/* QAOA Status */}
        {optimizing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-medical text-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">Running QAOA Optimization...</p>
            <p className="text-sm text-muted-foreground">Evaluating {nearby.length} hospitals with quantum-inspired cost function</p>
          </motion.div>
        )}

        {/* Results */}
        {optimized && bestHospital && (
          <>
            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: <MapPin className="h-5 w-5" />, label: "Best Hospital", value: bestHospital.hospital.name, color: "text-success" },
                { icon: <Navigation className="h-5 w-5" />, label: "Distance", value: `${bestHospital.distance.toFixed(1)} km`, color: "text-info" },
                { icon: <Clock className="h-5 w-5" />, label: "Est. Travel Time", value: `${travelTime} min`, color: "text-warning" },
                { icon: <Zap className="h-5 w-5" />, label: "QAOA Score", value: bestHospital.score.toFixed(3), color: "text-primary" },
              ].map((stat) => (
                <div key={stat.label} className="card-medical flex items-center gap-3">
                  <div className={`${stat.color} rounded-xl bg-muted p-3`}>{stat.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Map */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="card-medical overflow-hidden p-0">
              <div className="h-[400px]">
                <iframe
                  title="Hospital Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.08}%2C${lat - 0.06}%2C${lon + 0.08}%2C${lat + 0.06}&layer=mapnik&marker=${lat}%2C${lon}`}
                />
              </div>
              <div className="p-4 space-y-2">
                {nearby.slice(0, 5).map((h) => (
                  <div key={h.hospital.name} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${h.hospital.name === bestHospital.hospital.name ? "bg-success/15 border border-success/30" : "bg-muted/50"}`}>
                    <span className="font-medium text-foreground">
                      {h.hospital.name === bestHospital.hospital.name ? "⭐ " : "🏥 "}
                      {h.hospital.name}
                    </span>
                    <span className="text-muted-foreground">{h.distance.toFixed(1)} km</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Navigate button */}
            <div className="flex justify-center gap-3">
              <a href={directionsLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground font-semibold hover:bg-primary/90 transition">
                <Navigation className="h-5 w-5" /> Navigate to Hospital
              </a>
            </div>

            {/* ===== ALERT CONTACTS SECTION ===== */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="card-medical border-2 border-emergency/30">
              <div className="flex items-center gap-2 mb-4">
                <Siren className="h-5 w-5 text-emergency" />
                <h2 className="font-display text-xl font-bold text-foreground">Send Emergency Alerts</h2>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Send alerts to your {profile.emergencyContacts.length} emergency contact(s) with location, hospital directions, and delivery information.
              </p>

              {/* Alert Preview */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Message Preview</p>
                <div className="text-sm text-foreground space-y-2 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
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
                  </div>
                </div>
              </div>

              {/* Individual contacts */}
              <div className="space-y-3 mb-5">
                <p className="text-sm font-semibold text-foreground">Emergency Contacts:</p>
                {profile.emergencyContacts.map((contact, i) => (
                  <div key={contact.id || i} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{contact.name || `Contact ${i + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contact.email && (
                        <Button
                          size="sm"
                          onClick={() => sendEmailAlert(contact.email, contact.name)}
                          className={emailsSent.includes(contact.email)
                            ? "bg-success text-success-foreground"
                            : "bg-info text-info-foreground hover:bg-info/90"}
                        >
                          {emailsSent.includes(contact.email)
                            ? <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Email Sent</>
                            : <><Mail className="h-3.5 w-3.5 mr-1" /> Email: {contact.email}</>}
                        </Button>
                      )}
                      {contact.phone && (
                        <Button
                          size="sm"
                          onClick={() => sendSMSAlert(contact.phone)}
                          className={smsSent.includes(contact.phone)
                            ? "bg-success text-success-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}
                        >
                          {smsSent.includes(contact.phone)
                            ? <><CheckCircle className="h-3.5 w-3.5 mr-1" /> SMS Sent</>
                            : <><MessageCircle className="h-3.5 w-3.5 mr-1" /> SMS: {contact.phone}</>}
                        </Button>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${encodeURIComponent(contact.phone)}`}
                          className="inline-flex items-center gap-1 rounded-md bg-emergency/10 border border-emergency/30 px-3 py-1.5 text-sm font-medium text-emergency hover:bg-emergency/20 transition"
                        >
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Send to all */}
              <Button
                onClick={sendToAllContacts}
                className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90 py-6 text-lg font-bold"
              >
                <Send className="h-5 w-5 mr-2" />
                Send Alert to ALL Contacts
              </Button>
            </motion.div>

            {/* Make.com Webhook */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="card-medical">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">⚡ Automated Alert via Make.com</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Optionally connect a Make.com webhook to automate email/SMS alerts
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="https://hook.make.com/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendWebhook}
                  disabled={!webhookUrl || sendingWebhook || webhookSent}
                  className={webhookSent ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}
                >
                  {sendingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : webhookSent ? <><CheckCircle className="h-4 w-4 mr-1" /> Sent!</> : "Send via Webhook"}
                </Button>
              </div>
              {webhookSent && (
                <p className="text-sm text-success mt-2">✅ Emergency alert sent to Make.com webhook successfully!</p>
              )}
            </motion.div>
          </>
        )}

        {optimized && nearby.length === 0 && (
          <div className="card-medical text-center py-8">
            <p className="text-lg font-semibold text-foreground">No hospitals found within 100km</p>
            <p className="text-muted-foreground">Try adjusting your coordinates</p>
          </div>
        )}

        <div className="text-center pb-8">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>← Back to Dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default Emergency;
