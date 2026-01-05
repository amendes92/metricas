export interface SolarReportData {
  address: string;
  annualSavings: number;
  sunlightHours: number;
  systemSizeKw: number;
  co2OffsetTons: number;
  estimatedCost: number;
  paybackPeriodYears: number;
  monthlySavings: number[]; // Array of 12 numbers for chart
  summary: string;
}

export interface Lead {
  id: string;
  homeownerName: string;
  address: string;
  phoneNumber: string;
  email: string;
  estimatedSystemSize: number;
  generatedAt: string;
  status: 'available' | 'sold';
  price: number;
}

export enum UserMode {
  HOMEOWNER = 'HOMEOWNER',
  INSTALLER = 'INSTALLER',
}
