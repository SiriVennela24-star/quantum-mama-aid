import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { loadProfile } from "@/lib/store";
import { UserProfile } from "@/lib/types";
import { peruHospitals } from "@/lib/hospitals";
import { findNearbyHospitals, qaoaOptimize, estimateTravelTime } from "@/lib/qaoa";
import { sendEmergencyWebhook } from "@/lib/webhook";
import { Siren, MapPin, Clock, Navigation, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const bestIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

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

  useEffect(() => {
    const p = loadProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);

    // Try geolocation
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
    // Simulate QAOA processing delay
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
  const googleMapsLink = `https://maps.google.com/?q=${bestHospital?.hospital.latitude},${bestHospital?.hospital.longitude}`;

  const handleSendWebhook = async () => {
    if (!profile || !bestHospital || !webhookUrl) return;
    setSendingWebhook(true);
    await sendEmergencyWebhook(webhookUrl, {
      name: profile.name,
      message: "Possible labour pain emergency detected via QuantumMom",
      location: `https://maps.google.com/?q=${lat},${lon}`,
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: <MapPin className="h-5 w-5" />, label: "Best Hospital", value: bestHospital.hospital.name, color: "text-success" },
                { icon: <Navigation className="h-5 w-5" />, label: "Distance", value: `${bestHospital.distance.toFixed(1)} km`, color: "text-info" },
                { icon: <Clock className="h-5 w-5" />, label: "Est. Travel Time", value: `${travelTime} min`, color: "text-warning" },
                { icon: <AlertTriangle className="h-5 w-5" />, label: "QAOA Score", value: bestHospital.score.toFixed(3), color: "text-primary" },
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
                <MapContainer center={[lat, lon]} zoom={12} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lon]} icon={userIcon}>
                    <Popup>📍 Your Location</Popup>
                  </Marker>
                  {nearby.map((h) => (
                    <Marker key={h.hospital.name} position={[h.hospital.latitude, h.hospital.longitude]}
                      icon={h.hospital.name === bestHospital.hospital.name ? bestIcon : hospitalIcon}>
                      <Popup>
                        🏥 {h.hospital.name}<br />
                        {h.distance.toFixed(1)} km away
                        {h.hospital.name === bestHospital.hospital.name && <><br /><strong>⭐ QAOA Optimal</strong></>}
                      </Popup>
                    </Marker>
                  ))}
                  <Polyline
                    positions={[[lat, lon], [bestHospital.hospital.latitude, bestHospital.hospital.longitude]]}
                    color="hsl(0, 80%, 50%)" weight={4} dashArray="10,10"
                  />
                </MapContainer>
              </div>
            </motion.div>

            {/* Webhook */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="card-medical">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">📧 Send Emergency Alert (Make.com)</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Enter your Make.com webhook URL to alert {profile.emergencyContacts.length} emergency contact(s)
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
                  className={webhookSent ? "bg-success text-success-foreground" : "bg-emergency text-emergency-foreground hover:bg-emergency/90"}
                >
                  {sendingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : webhookSent ? <><CheckCircle className="h-4 w-4 mr-1" /> Sent!</> : "Send Alert"}
                </Button>
              </div>
              {webhookSent && (
                <p className="text-sm text-success mt-2">✅ Emergency alert sent to Make.com webhook successfully!</p>
              )}
            </motion.div>

            {/* Google Maps Link */}
            <div className="text-center">
              <a href={googleMapsLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground font-semibold hover:bg-primary/90 transition">
                <Navigation className="h-5 w-5" />
                Open in Google Maps
              </a>
            </div>
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
