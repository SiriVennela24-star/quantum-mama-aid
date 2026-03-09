import { Hospital } from "./types";

// QAOA-inspired quantum optimization simulation
// Simulates Quantum Approximate Optimization Algorithm for hospital selection

interface HospitalWithDistance {
  hospital: Hospital;
  distance: number;
  score: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simulated QAOA cost function evaluation
function qaoaCostFunction(distances: number[], gammas: number[], betas: number[]): number[] {
  const n = distances.length;
  const scores = new Array(n).fill(0);

  for (let layer = 0; layer < gammas.length; layer++) {
    const gamma = gammas[layer];
    const beta = betas[layer];

    for (let i = 0; i < n; i++) {
      // Phase separation (cost Hamiltonian)
      const costPhase = Math.exp(-gamma * distances[i]);
      // Mixing operator
      const mixingPhase = Math.cos(beta) + Math.sin(beta) * (1 / (1 + distances[i]));
      scores[i] += costPhase * mixingPhase;
    }
  }

  return scores;
}

export function findNearbyHospitals(
  userLat: number,
  userLon: number,
  hospitals: Hospital[],
  radiusKm: number = 50
): HospitalWithDistance[] {
  return hospitals
    .map((h) => ({
      hospital: h,
      distance: haversineDistance(userLat, userLon, h.latitude, h.longitude),
      score: 0,
    }))
    .filter((h) => h.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

export function qaoaOptimize(
  userLat: number,
  userLon: number,
  nearbyHospitals: HospitalWithDistance[]
): HospitalWithDistance | null {
  if (nearbyHospitals.length === 0) return null;
  if (nearbyHospitals.length === 1) return { ...nearbyHospitals[0], score: 1.0 };

  const distances = nearbyHospitals.map((h) => h.distance);

  // QAOA parameters (p=3 layers)
  const p = 3;
  const gammas = Array.from({ length: p }, (_, i) => (Math.PI * (i + 1)) / (2 * p));
  const betas = Array.from({ length: p }, (_, i) => (Math.PI * (i + 1)) / (4 * p));

  const scores = qaoaCostFunction(distances, gammas, betas);

  // Apply scores
  const scored = nearbyHospitals.map((h, i) => ({ ...h, score: scores[i] }));
  scored.sort((a, b) => b.score - a.score);

  return scored[0];
}

export function estimateTravelTime(distanceKm: number): number {
  // Average speed 30 km/h in urban Peru
  return Math.ceil((distanceKm / 30) * 60);
}
