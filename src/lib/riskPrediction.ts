import { RiskLevel, UserProfile } from "./types";

// KNN-inspired risk prediction using weighted features
interface TrainingPoint {
  features: number[];
  risk: RiskLevel;
}

const trainingData: TrainingPoint[] = [
  { features: [22, 110, 60, 3, 0], risk: "Low" },
  { features: [25, 115, 65, 5, 0], risk: "Low" },
  { features: [28, 120, 70, 7, 0], risk: "Low" },
  { features: [30, 118, 68, 4, 0], risk: "Low" },
  { features: [24, 122, 72, 6, 0], risk: "Low" },
  { features: [32, 130, 80, 6, 1], risk: "Medium" },
  { features: [35, 135, 85, 7, 1], risk: "Medium" },
  { features: [29, 128, 78, 8, 1], risk: "Medium" },
  { features: [33, 132, 82, 5, 0], risk: "Medium" },
  { features: [31, 140, 88, 7, 1], risk: "Medium" },
  { features: [38, 150, 95, 8, 1], risk: "High" },
  { features: [40, 160, 100, 9, 1], risk: "High" },
  { features: [36, 155, 98, 7, 1], risk: "High" },
  { features: [42, 145, 92, 8, 1], risk: "High" },
  { features: [39, 158, 105, 9, 1], risk: "High" },
];

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 0.2), 0));
}

function normalizeFeatures(features: number[]): number[] {
  const mins = [18, 90, 45, 1, 0];
  const maxs = [45, 180, 120, 9, 1];
  return features.map((v, i) => (v - mins[i]) / (maxs[i] - mins[i]));
}

export function predictRisk(profile: UserProfile): { risk: RiskLevel; confidence: number } {
  const hasComplications = profile.previousComplications && profile.previousComplications.toLowerCase() !== "none" && profile.previousComplications.length > 0 ? 1 : 0;
  const input = normalizeFeatures([profile.age, profile.bloodPressure, profile.weight, profile.pregnancyMonth, hasComplications]);

  const k = 5;
  const distances = trainingData.map((point) => ({
    distance: euclideanDistance(input, normalizeFeatures(point.features)),
    risk: point.risk,
  }));
  distances.sort((a, b) => a.distance - b.distance);
  const neighbors = distances.slice(0, k);

  const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
  neighbors.forEach((n) => { counts[n.risk]++; });

  const risk = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as RiskLevel;
  const confidence = (counts[risk] / k) * 100;

  return { risk, confidence };
}

export function getNutritionRecommendations(profile: UserProfile): string[] {
  const month = profile.pregnancyMonth;
  const recs: string[] = [];

  if (month <= 3) {
    recs.push("🥬 Folate-rich foods: spinach, lentils, asparagus");
    recs.push("🍊 Vitamin C: citrus fruits, bell peppers");
    recs.push("🥚 Protein: eggs, lean meats, beans");
  } else if (month <= 6) {
    recs.push("🥛 Calcium-rich: milk, yogurt, cheese");
    recs.push("🐟 Omega-3: salmon, walnuts, chia seeds");
    recs.push("🥩 Iron-rich: red meat, spinach, quinoa");
  } else {
    recs.push("🍠 Complex carbs: sweet potatoes, brown rice");
    recs.push("🥑 Healthy fats: avocado, nuts, olive oil");
    recs.push("🫐 Antioxidants: berries, dark chocolate");
  }

  if (profile.ironIntake < 50) recs.push("⚠️ Increase iron intake – eat more leafy greens & red meat");
  if (profile.calciumIntake < 50) recs.push("⚠️ Increase calcium – add more dairy or fortified foods");
  if (profile.waterIntake < 8) recs.push("💧 Drink at least 8 glasses of water daily");

  return recs;
}

export function getBabyDevelopment(month: number): { stage: string; description: string; size: string } {
  const stages: Record<number, { stage: string; description: string; size: string }> = {
    1: { stage: "Embryo Formation", description: "The fertilized egg implants in the uterus. Neural tube begins forming.", size: "Poppy seed" },
    2: { stage: "Early Development", description: "Heart begins beating. Tiny buds for arms and legs appear.", size: "Kidney bean" },
    3: { stage: "Fetal Stage Begins", description: "Fingers and toes form. Baby can make small movements.", size: "Lime" },
    4: { stage: "Growing Stronger", description: "Baby can hear sounds. Facial features becoming defined.", size: "Avocado" },
    5: { stage: "Movement Felt", description: "You may feel the baby kick! Hair begins to grow.", size: "Banana" },
    6: { stage: "Rapid Growth", description: "Baby responds to light and sound. Lungs developing.", size: "Corn ear" },
    7: { stage: "Brain Development", description: "Brain grows rapidly. Baby opens and closes eyes.", size: "Cauliflower" },
    8: { stage: "Almost Ready", description: "Baby gains weight fast. Most organs fully developed.", size: "Pineapple" },
    9: { stage: "Full Term", description: "Baby is ready for birth! Head typically moves down.", size: "Watermelon" },
  };
  return stages[month] || stages[5];
}

export function predictDeliveryWindow(profile: UserProfile): string {
  const due = new Date(profile.dueDate);
  const early = new Date(due);
  early.setDate(early.getDate() - 14);
  const late = new Date(due);
  late.setDate(late.getDate() + 7);
  return `${early.toLocaleDateString()} – ${late.toLocaleDateString()}`;
}
