// Preço médio do kWh residencial por estado (Base ANEEL/Mercado Livre de Energia - Estimativa 2024/2025)
// Valores incluem impostos (ICMS/PIS/COFINS) aproximados.

export const BRAZIL_TARIFFS: Record<string, number> = {
    'AC': 0.98,
    'AL': 0.89,
    'AP': 0.85,
    'AM': 0.95,
    'BA': 0.92,
    'CE': 0.90,
    'DF': 0.83,
    'ES': 0.88,
    'GO': 0.86,
    'MA': 0.94,
    'MT': 0.91,
    'MS': 0.93,
    'MG': 0.95, // CEMIG costuma ser alta
    'PA': 0.99, // Equatorial Pará
    'PB': 0.87,
    'PR': 0.84, // Copel
    'PE': 0.91,
    'PI': 0.96,
    'RJ': 1.15, // Enel/Light - Uma das mais caras
    'RN': 0.88,
    'RS': 0.85,
    'RO': 0.89,
    'RR': 0.90,
    'SC': 0.78, // Celesc costuma ser menor
    'SP': 0.92, // Média Enel/CPFL
    'SE': 0.88,
    'TO': 0.93,
    // Fallback Nacional
    'BR': 0.90
};

export const getTariffByState = (address: string): number => {
    // Procura por siglas de estado (ex: " SP ", "-SP", ", SP")
    const match = address.toUpperCase().match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
    
    if (match && match[0]) {
        return BRAZIL_TARIFFS[match[0]];
    }
    
    return BRAZIL_TARIFFS['BR'];
};