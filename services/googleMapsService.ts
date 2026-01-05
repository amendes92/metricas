
// Service to handle Google Maps and Solar API interactions

// Robust API Key retrieval: Try LocalStorage (User Input) -> process.env -> Fallback
export const getApiKey = () => {
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('solar_api_key');
    if (storedKey) return storedKey;
  }
  
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // Check if process.env.API_KEY is actually set and not an empty placeholder
      if (process.env.API_KEY.length > 10) {
        return process.env.API_KEY;
      }
    }
  } catch (e) {
    // process is not defined
  }
  
  // Default fallback (User Key provided in prompt)
  return 'AIzaSyDnPfZQAuZP9Hl3S734fvXM1q4UrxhXZ-w';
};

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const getCoordinates = async (address: string): Promise<GeocodeResult> => {
  const API_KEY = getApiKey();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || !data.results[0]) {
      console.warn(`Geocoding API Warning: ${data.status}. Using fallback coordinates.`);
      
      // Fallback logic remains same
      const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const latOffset = (hash % 100) / 10000;
      const lngOffset = (hash % 50) / 10000;

      return {
        lat: -23.5505 + latOffset, 
        lng: -46.6333 + lngOffset,
        formattedAddress: address + " (Simulado)"
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
    return {
      lat: -23.5505,
      lng: -46.6333,
      formattedAddress: address + " (Offline)"
    };
  }
};

export const getSolarInsights = async (lat: number, lng: number) => {
  const API_KEY = getApiKey();
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        const errText = await response.text();
        console.warn("Solar API error (using estimated data):", response.status, errText);
        return null; 
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Error fetching solar insights (using estimated data):", error);
    return null;
  }
};

export const getStaticMapUrl = (lat: number, lng: number, zoom: number = 19, size: string = '600x400'): string => {
  const API_KEY = getApiKey();
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&markers=color:orange%7C${lat},${lng}&key=${API_KEY}`;
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
