export interface SolarReportData {
  address: string;
  lat: number;
  lng: number;
  annualSavings: number;
  sunlightHours: number;
  systemSizeKw: number;
  co2OffsetTons: number;
  estimatedCost: number;
  paybackPeriodYears: number;
  monthlySavings: number[]; 
  summary: string;
  // New Solar API specific fields
  maxPanels?: number;
  panelCapacityWatts?: number;
  carbonOffsetFactor?: number; // Kg per MWh
  monthlyBill?: number; // User input or default
  roofQuality?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  roofAreaSqMeters?: number;
  localEnergyRate?: number; // Fetched via GenAI Search
}

export interface Lead {
  id: string;
  homeownerName: string;
  address: string;
  lat: number;
  lng: number;
  phoneNumber: string;
  email: string;
  estimatedSystemSize: number;
  generatedAt: string;
  status: 'available' | 'sold';
  price: number;
  distanceKm?: number; // Distance from installer
}

export enum UserMode {
  LOGIN = 'LOGIN',
  HOMEOWNER = 'HOMEOWNER',
  INSTALLER = 'INSTALLER',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface InstallerProfile {
  id: string;
  name: string;
  company: string;
  credits: number;
  rating: number;
  location: { lat: number, lng: number };
}
