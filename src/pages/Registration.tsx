import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserProfile, EmergencyContact } from "@/lib/types";
import { saveProfile } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Heart, Baby, Utensils, Phone, Plus, Trash2 } from "lucide-react";
import QuantumMomHeader from "@/components/QuantumMomHeader";

const Registration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    name: "", age: 25, phone: "", email: "", address: "", city: "",
    pregnancyMonth: 4, dueDate: "", bloodPressure: 120, weight: 65, height: 160,
    previousComplications: "",
    dietType: "non-vegetarian" as "vegetarian" | "non-vegetarian",
    waterIntake: 8, nutritionLevel: 70, ironIntake: 50, calciumIntake: 50,
  });

  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "", relationship: "", phone: "", email: "" },
  ]);

  const updateField = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const addContact = () => {
    setContacts((c) => [...c, { id: Date.now().toString(), name: "", relationship: "", phone: "", email: "" }]);
  };

  const removeContact = (id: string) => {
    if (contacts.length > 1) setContacts((c) => c.filter((x) => x.id !== id));
  };

  const updateContact = (id: string, field: string, value: string) => {
    setContacts((c) => c.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const handleSubmit = () => {
    const profile: UserProfile = { ...form, emergencyContacts: contacts };
    saveProfile(profile);
    navigate("/dashboard");
  };

  const steps = ["Personal", "Pregnancy", "Diet", "Emergency"];

  const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  return (
    <div className="min-h-screen bg-background">
      <QuantumMomHeader subtitle="AI + Quantum-Assisted Pregnancy Monitoring" />

      {/* Step indicator */}
      <div className="flex justify-center gap-2 py-6">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              i === step
                ? "bg-primary text-primary-foreground shadow-md"
                : i < step
                ? "bg-success/20 text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i === 0 && <Heart className="h-3.5 w-3.5" />}
            {i === 1 && <Baby className="h-3.5 w-3.5" />}
            {i === 2 && <Utensils className="h-3.5 w-3.5" />}
            {i === 3 && <Phone className="h-3.5 w-3.5" />}
            {s}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-12">
        {/* Step 0: Personal */}
        {step === 0 && (
          <motion.div {...fadeIn} className="card-medical space-y-5">
            <h2 className="font-display text-2xl font-bold text-foreground">Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label className="text-muted-foreground">Full Name</Label><Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="María García" /></div>
              <div><Label className="text-muted-foreground">Age</Label><Input type="number" value={form.age} onChange={(e) => updateField("age", +e.target.value)} /></div>
              <div><Label className="text-muted-foreground">Phone</Label><Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+51 999 999 999" /></div>
              <div><Label className="text-muted-foreground">Email</Label><Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="maria@email.com" /></div>
              <div className="sm:col-span-2"><Label className="text-muted-foreground">Address</Label><Input value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Av. Javier Prado 123" /></div>
              <div className="sm:col-span-2"><Label className="text-muted-foreground">City</Label><Input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Lima" /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">Next →</Button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Pregnancy */}
        {step === 1 && (
          <motion.div {...fadeIn} className="card-medical space-y-5">
            <h2 className="font-display text-2xl font-bold text-foreground">Pregnancy Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Pregnancy Month</Label>
                <Select value={String(form.pregnancyMonth)} onValueChange={(v) => updateField("pregnancyMonth", +v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7,8,9].map((m) => <SelectItem key={m} value={String(m)}>Month {m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-muted-foreground">Expected Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} /></div>
              <div><Label className="text-muted-foreground">Blood Pressure (mmHg)</Label><Input type="number" value={form.bloodPressure} onChange={(e) => updateField("bloodPressure", +e.target.value)} /></div>
              <div><Label className="text-muted-foreground">Weight (kg)</Label><Input type="number" value={form.weight} onChange={(e) => updateField("weight", +e.target.value)} /></div>
              <div><Label className="text-muted-foreground">Height (cm)</Label><Input type="number" value={form.height} onChange={(e) => updateField("height", +e.target.value)} /></div>
              <div className="sm:col-span-2"><Label className="text-muted-foreground">Previous Complications</Label><Input value={form.previousComplications} onChange={(e) => updateField("previousComplications", e.target.value)} placeholder="None, or describe..." /></div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={() => setStep(2)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">Next →</Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Diet */}
        {step === 2 && (
          <motion.div {...fadeIn} className="card-medical space-y-5">
            <h2 className="font-display text-2xl font-bold text-foreground">Diet & Nutrition</h2>
            <div className="space-y-5">
              <div>
                <Label className="text-muted-foreground">Diet Type</Label>
                <Select value={form.dietType} onValueChange={(v) => updateField("dietType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vegetarian">🥬 Vegetarian</SelectItem>
                    <SelectItem value="non-vegetarian">🥩 Non-Vegetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-muted-foreground">Water Intake (glasses/day): {form.waterIntake}</Label><Slider value={[form.waterIntake]} onValueChange={([v]) => updateField("waterIntake", v)} min={1} max={15} step={1} /></div>
              <div><Label className="text-muted-foreground">Daily Nutrition Level: {form.nutritionLevel}%</Label><Slider value={[form.nutritionLevel]} onValueChange={([v]) => updateField("nutritionLevel", v)} min={0} max={100} /></div>
              <div><Label className="text-muted-foreground">Iron Intake Level: {form.ironIntake}%</Label><Slider value={[form.ironIntake]} onValueChange={([v]) => updateField("ironIntake", v)} min={0} max={100} /></div>
              <div><Label className="text-muted-foreground">Calcium Intake Level: {form.calciumIntake}%</Label><Slider value={[form.calciumIntake]} onValueChange={([v]) => updateField("calciumIntake", v)} min={0} max={100} /></div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">Next →</Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Emergency Contacts */}
        {step === 3 && (
          <motion.div {...fadeIn} className="card-medical space-y-5">
            <h2 className="font-display text-2xl font-bold text-foreground">Emergency Contacts</h2>
            {contacts.map((c, i) => (
              <div key={c.id} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Contact {i + 1}</span>
                  {contacts.length > 1 && (
                    <button onClick={() => removeContact(c.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Contact Name" value={c.name} onChange={(e) => updateContact(c.id, "name", e.target.value)} />
                  <Input placeholder="Relationship" value={c.relationship} onChange={(e) => updateContact(c.id, "relationship", e.target.value)} />
                  <Input placeholder="Phone" value={c.phone} onChange={(e) => updateContact(c.id, "phone", e.target.value)} />
                  <Input placeholder="Email" value={c.email} onChange={(e) => updateContact(c.id, "email", e.target.value)} />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addContact} className="w-full border-dashed">
              <Plus className="mr-2 h-4 w-4" /> Add Another Contact
            </Button>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={handleSubmit} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 text-lg font-bold">
                Complete Registration 🎉
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Registration;
