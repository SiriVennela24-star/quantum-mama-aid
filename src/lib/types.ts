export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface UserProfile {
  // Personal
  name: string;
  age: number;
  phone: string;
  email: string;
  address: string;
  city: string;
  // Pregnancy
  pregnancyMonth: number;
  dueDate: string;
  bloodPressure: number;
  weight: number;
  height: number;
  previousComplications: string;
  // Diet
  dietType: "vegetarian" | "non-vegetarian";
  waterIntake: number;
  nutritionLevel: number;
  ironIntake: number;
  calciumIntake: number;
  // Emergency
  emergencyContacts: EmergencyContact[];
}

export interface Hospital {
  name: string;
  latitude: number;
  longitude: number;
  city: string;
}

export type RiskLevel = "Low" | "Medium" | "High";
