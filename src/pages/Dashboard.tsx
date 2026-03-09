import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { loadProfile } from "@/lib/store";
import { UserProfile } from "@/lib/types";
import { predictRisk, getNutritionRecommendations, getBabyDevelopment, predictDeliveryWindow } from "@/lib/riskPrediction";
import { peruHospitals } from "@/lib/hospitals";
import { findNearbyHospitals } from "@/lib/qaoa";
import { Heart, Baby, Activity, AlertTriangle, Apple, Clock, MapPin, Phone, Siren } from "lucide-react";
import QuantumMomHeader from "@/components/QuantumMomHeader";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
  }, [navigate]);

  if (!profile) return null;

  const weeksRemaining = Math.max(0, (40 - profile.pregnancyMonth * 4));
  const daysUntilDue = profile.dueDate
    ? Math.max(0, Math.ceil((new Date(profile.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : weeksRemaining * 7;

  const { risk, confidence } = predictRisk(profile);
  const nutrition = getNutritionRecommendations(profile);
  const baby = getBabyDevelopment(profile.pregnancyMonth);
  const deliveryWindow = predictDeliveryWindow(profile);

  // Find nearest hospital (default Lima coords)
  const nearby = findNearbyHospitals(-12.046, -77.043, peruHospitals, 50);
  const nearestHospital = nearby.length > 0 ? nearby[0] : null;

  const riskClass = risk === "Low" ? "risk-low" : risk === "Medium" ? "risk-medium" : "risk-high";
  const riskEmoji = risk === "Low" ? "✅" : risk === "Medium" ? "⚠️" : "🚨";

  const fadeIn = (delay = 0) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } });

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <QuantumMomHeader compact subtitle={`Welcome, ${profile.name || "Mom"} 💕`} />
        <button onClick={() => navigate("/")} className="absolute top-6 right-6 z-20 rounded-lg bg-primary-foreground/20 px-4 py-2 text-sm text-primary-foreground hover:bg-primary-foreground/30 transition">
          Edit Profile
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Quick Stats */}
        <motion.div {...fadeIn()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Baby className="h-5 w-5" />, label: "Month", value: `${profile.pregnancyMonth} / 9`, color: "text-primary" },
            { icon: <Clock className="h-5 w-5" />, label: "Days Until Due", value: String(daysUntilDue), color: "text-info" },
            { icon: <Phone className="h-5 w-5" />, label: "Emergency Contacts", value: String(profile.emergencyContacts.length), color: "text-secondary" },
            { icon: <MapPin className="h-5 w-5" />, label: "Nearest Hospital", value: nearestHospital ? `${nearestHospital.distance.toFixed(1)} km` : "N/A", color: "text-success" },
          ].map((stat) => (
            <div key={stat.label} className="card-medical flex items-center gap-4">
              <div className={`${stat.color} rounded-xl bg-muted p-3`}>{stat.icon}</div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Risk Prediction */}
          <motion.div {...fadeIn(0.1)} className="card-medical">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">Health Risk Prediction</h2>
            </div>
            <div className="text-center py-6">
              <div className={`inline-block rounded-2xl border-2 px-8 py-4 ${riskClass}`}>
                <span className="text-3xl">{riskEmoji}</span>
                <p className="text-2xl font-extrabold mt-1">{risk} Risk</p>
                <p className="text-sm opacity-75">{confidence}% confidence (KNN)</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>📊 Based on: Age ({profile.age}), BP ({profile.bloodPressure}), Weight ({profile.weight}kg)</p>
              <p>🤖 Algorithm: K-Nearest Neighbors with {5} neighbors</p>
            </div>
          </motion.div>

          {/* Baby Development */}
          <motion.div {...fadeIn(0.15)} className="card-medical">
            <div className="flex items-center gap-2 mb-4">
              <Baby className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-xl font-bold text-foreground">Baby Development – Month {profile.pregnancyMonth}</h2>
            </div>
            <div className="rounded-xl bg-muted/50 p-5 text-center">
              <p className="text-4xl mb-2">👶</p>
              <p className="text-lg font-bold text-foreground">{baby.stage}</p>
              <p className="text-muted-foreground mt-2">{baby.description}</p>
              <div className="mt-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-primary font-semibold text-sm">
                Size: ~{baby.size}
              </div>
            </div>
          </motion.div>

          {/* Nutrition */}
          <motion.div {...fadeIn(0.2)} className="card-medical">
            <div className="flex items-center gap-2 mb-4">
              <Apple className="h-5 w-5 text-success" />
              <h2 className="font-display text-xl font-bold text-foreground">Nutrition Recommendations</h2>
            </div>
            <ul className="space-y-3">
              {nutrition.map((rec, i) => (
                <li key={i} className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-foreground">{rec}</li>
              ))}
            </ul>
          </motion.div>

          {/* Delivery Prediction */}
          <motion.div {...fadeIn(0.25)} className="card-medical">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-emergency" />
              <h2 className="font-display text-xl font-bold text-foreground">Delivery Prediction</h2>
            </div>
            <div className="rounded-xl bg-muted/50 p-5 text-center">
              <p className="text-muted-foreground text-sm">Estimated delivery window</p>
              <p className="text-xl font-bold text-foreground mt-2">{deliveryWindow}</p>
              <p className="text-sm text-muted-foreground mt-3">
                Weeks remaining: ~{weeksRemaining} weeks
              </p>
            </div>
            {nearestHospital && (
              <div className="mt-4 rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold text-foreground">🏥 Nearest Hospital</p>
                <p className="text-muted-foreground">{nearestHospital.hospital.name}</p>
                <p className="text-muted-foreground">{nearestHospital.distance.toFixed(1)} km away</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Emergency Button */}
        <motion.div {...fadeIn(0.3)} className="text-center py-8">
          <p className="text-muted-foreground mb-4 flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-emergency" />
            If you're experiencing labour pain, press the button below
          </p>
          <button
            onClick={() => navigate("/emergency")}
            className="btn-emergency animate-pulse-emergency inline-flex items-center gap-3"
          >
            <Siren className="h-7 w-7" />
            Emergency – Possible Labour Pain
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
