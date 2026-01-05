// Service to handle Google Maps and Solar API interactions
// Implements a "Hybrid" approach: Tries Backend Proxy first, falls back to Direct API if offline.

const API_BASE_URL = 'http://localhost:3001/api';
const DIRECT_API_KEY = 'AIzaSyDnPfZQAuZP9Hl3S734fvXM1q4UrxhXZ-w';

export const getApiKey = () => {
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('solar_api_key');
    if (storedKey) return storedKey;
  }
  return DIRECT_API_KEY;
};

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const getCoordinates = async (address: string): Promise<GeocodeResult> => {
  // 1. Try Backend Proxy
  try {
    const response = await fetch(`${API_BASE_URL}/coordinates?address=${encodeURIComponent(address)}`);
    if (!response.ok) throw new Error("Backend unavailable");
    
    const data = await response.json();
    if (data.status === 'OK' && data.results?.[0]) {
       const result = data.results[0];
       return {
         lat: result.geometry.location.lat,
         lng: result.geometry.location.lng,
         formattedAddress: result.formatted_address
       };
    }
  } catch (backendError) {
    console.warn("Backend Proxy Failed (Geocoding), attempting Direct API fallback...");
  }

  // 2. Fallback: Direct API Call
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${getApiKey()}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.[0]) {
       const result = data.results[0];
       return {
         lat: result.geometry.location.lat,
         lng: result.geometry.location.lng,
         formattedAddress: result.formatted_address
       };
    } else {
        console.warn("Direct Geocoding API Error:", data.status);
    }
  } catch (directError) {
    console.error("Direct Geocoding Network Error:", directError);
  }

  // 3. Final Fallback: Offline Simulation
  return {
      lat: -23.5505,
      lng: -46.6333,
      formattedAddress: address + " (Modo Offline/Simulado)"
  };
};

export const getSolarInsights = async (lat: number, lng: number) => {
  // 1. Try Backend Proxy
  try {
      const response = await fetch(`${API_BASE_URL}/solar-potential?lat=${lat}&lng=${lng}`);
      if (!response.ok) throw new Error("Backend unavailable");
      return await response.json();
  } catch (e) {
      console.warn("Backend Solar API Failed, attempting Direct API fallback...");
  }

  // 2. Fallback: Direct API
  // Note: Solar API often has strict CORS policies. If this fails in browser, we return null.
  try {
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${getApiKey()}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
      console.error("Direct Solar API Failed:", e);
      return null;
  }
};

export const getStaticMapUrl = (lat: number, lng: number, zoom: number = 19, size: string = '600x400'): string => {
  // Use Direct URL to ensure image loads even if local backend is down.
  // The API Key is exposed in the URL, which is standard for client-side maps unless proxied.
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&markers=color:orange%7C${lat},${lng}&key=${getApiKey()}`;
};

export const getDirectionsUrl = (originLat: number, originLng: number, destLat: number, destLng: number): string => {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
};

export const autocompleteAddress = async (input: string): Promise<string[]> => {
    if (input.length < 4) return [];
    await new Promise(r => setTimeout(r, 200));
    return [
        `${input}, São Paulo - SP`,
        `${input}, Rio de Janeiro - RJ`,
        `${input}, Curitiba - PR`,
        `Rua ${input}, Belo Horizonte - MG`,
        `Avenida ${input}, Brasília - DF`
    ];
};