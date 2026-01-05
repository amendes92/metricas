import React from 'react';

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
  
  // RAW Solar API Data for Visualization
  solarPotential?: {
    maxArrayPanelsCount: number;
    roofSegmentStats: RoofSegmentStat[];
    solarPanelConfigs: SolarPanelConfig[];
    wholeRoofStats: {
        areaMeters2: number;
        boundingBox: LatLngBox;
    };
  };
}

export interface LatLngBox {
    sw: { latitude: number; longitude: number };
    ne: { latitude: number; longitude: number };
}

export interface RoofSegmentStat {
    pitchDegrees: number;
    azimuthDegrees: number;
    stats: {
        areaMeters2: number;
        sunshineQuantiles: number[];
        groundAreaMeters2: number;
    };
    center: { latitude: number; longitude: number };
    boundingBox: LatLngBox;
    planeHeightAtCenterMeters: number;
}

export interface SolarPanel {
    center: { latitude: number; longitude: number };
    orientation: 'LANDSCAPE' | 'PORTRAIT';
    segmentIndex: number;
    yearlyEnergyDcKwh: number;
}

export interface SolarPanelConfig {
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    roofSegmentSummaries: any[];
    solarPanels: SolarPanel[];
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
  TEST_MODE = 'TEST_MODE',
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

// Google Maps 3D Types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-map-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        center?: string; // lat,lng string or object
        tilt?: string | number;
        heading?: string | number;
        range?: string | number;
        'default-labels-disabled'?: boolean | string;
      };
      'gmp-polygon-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
          'altitude-mode'?: string;
          fillColor?: string;
          strokeColor?: string;
          strokeWidth?: string | number;
      };
      'gmp-marker-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
          position?: string;
          'altitude-mode'?: string;
      };
    }
  }
}