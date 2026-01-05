// Service to handle Google Maps and Solar API interactions

// Robust API Key retrieval: Try process.env first, fallback to user provided key if process is undefined or key is missing
const getUserKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // process is not defined, ignore
  }
  return 'AIzaSyDnPfZQAuZP9Hl3S734fvXM1q4UrxhXZ-w';
};

const API_KEY = getUserKey();

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const getCoordinates = async (address: string): Promise<GeocodeResult> => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || !data.results[0]) {
      console.warn(`Geocoding API Warning: ${data.status}. Using fallback coordinates.`);
      console.debug("Geocoding Error Details:", JSON.stringify(data, null, 2));
      
      // Fallback for demo/restricted key scenarios to ensure app flow continues
      // Use simple hashing of address to generate deterministic variance in location for demo
      const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const latOffset = (hash % 100) / 10000;
      const lngOffset = (hash % 50) / 10000;

      return {
        lat: -23.5505 + latOffset, // Base: São Paulo
        lng: -46.6333 + lngOffset,
        formattedAddress: address + " (Modo Demo)"
      };
    }

    const result = data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    console.error("Geocoding Network Error:", error);
    // Network error fallback
    return {
      lat: -23.5505,
      lng: -46.6333,
      formattedAddress: address + " (Offline)"
    };
  }
};

export const getSolarInsights = async (lat: number, lng: number) => {
  // Google Solar API endpoint for building insights
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        const errText = await response.text();
        console.warn("Solar API error (using estimated data):", response.status, errText);
        return null; // Return null to trigger GenAI estimation fallback
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Error fetching solar insights (using estimated data):", error);
    return null;
  }
};

export const getStaticMapUrl = (lat: number, lng: number, zoom: number = 19, size: string = '600x400'): string => {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&markers=color:orange%7C${lat},${lng}&key=${API_KEY}`;
};

export const getDirectionsUrl = (originLat: number, originLng: number, destLat: number, destLng: number): string => {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
};

// Mock function to simulate Places Autocomplete if JS SDK isn't fully loaded in this specific env
export const autocompleteAddress = async (input: string): Promise<string[]> => {
    if (input.length < 4) return [];
    
    // Simulating API latency
    await new Promise(r => setTimeout(r, 200));
    
    return [
        `${input}, São Paulo - SP`,
        `${input}, Rio de Janeiro - RJ`,
        `${input}, Curitiba - PR`,
        `Rua ${input}, Belo Horizonte - MG`,
        `Avenida ${input}, Brasília - DF`
    ];
};
