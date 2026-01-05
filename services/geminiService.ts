import { SolarReportData } from "../types";
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from "./googleMapsService";
import { getTariffByState } from "../data/tariffs";

const API_BASE_URL = 'http://localhost:3001/api';

// Helper to parse Gemini JSON (resilient)
const parseGeminiJson = (text: string): any => {
    try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
        let jsonStr = jsonMatch[1] || text;
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        if (jsonStr.startsWith('json')) jsonStr = jsonStr.substring(4);
        
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            return JSON.parse(jsonStr);
        }
        return {}; // Return empty if parsing fails, we will fill with math data
    } catch (e) {
        console.warn("JSON Parse warning", e);
        return {};
    }
};

export const generateSolarReportWithData = async (
  address: string, 
  lat: number, 
  lng: number, 
  solarData: any | null,
  monthlyBill: number = 300
): Promise<SolarReportData> => {
  
  // --- 1. ENGINEERING CALCULATIONS (Deterministic) ---
  const tariff = getTariffByState(address);
  const PANEL_POWER_WATTS = 550; // Painéis modernos 2024/2025
  const PANEL_PRICE_MARKET = 3200; // Preço médio instalado por kWp (Kit + Mão de obra)
  const AVG_IRRADIANCE = 125; // kWh gerado por kWp instalado por mês (Média Brasil conservadora)
  const PERFORMANCE_RATIO = 0.75; // Perdas por temperatura, sujeira, inversor
  const CO2_FACTOR = 0.085; // Toneladas de CO2 por MWh

  let systemSizeKw = 0;
  let maxPanels = 0;
  let roofQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Good';

  if (solarData && solarData.solarPotential) {
      // CENÁRIO 1: Temos dados precisos da Solar API
      maxPanels = solarData.solarPotential.maxArrayPanelsCount;
      
      // Capacidade Total do Telhado (Técnica)
      const roofCapacityKw = (maxPanels * PANEL_POWER_WATTS) / 1000;
      
      // Necessidade do Cliente (Baseado na Conta)
      const targetKwhMonth = monthlyBill / tariff;
      const neededSystemKw = targetKwhMonth / (AVG_IRRADIANCE * PERFORMANCE_RATIO / 100); // Simplificação de cálculo reverso
      
      // O sistema será o menor entre: O que cabe no telhado X O que o cliente precisa (+ margem de 20% p/ futuro)
      systemSizeKw = Math.min(roofCapacityKw, neededSystemKw * 1.2);
      
      // Se o telhado for muito pequeno para a necessidade
      if (roofCapacityKw < neededSystemKw) roofQuality = 'Fair';
      else roofQuality = 'Excellent';

  } else {
      // CENÁRIO 2: Fallback (Sem dados 3D) - Estimativa pela Conta
      const targetKwhMonth = monthlyBill / tariff;
      // Fórmula: Potência = Consumo / (Irradiação * Eficiência)
      // Usando fator consolidado 115 kWh/kWp mês ( considerando perdas)
      systemSizeKw = targetKwhMonth / 115; 
      maxPanels = Math.ceil((systemSizeKw * 1000) / PANEL_POWER_WATTS);
      roofQuality = 'Good'; // Assumimos bom até provar o contrário
  }

  // Arredondar sistema para 2 casas decimais
  systemSizeKw = Math.round(systemSizeKw * 100) / 100;

  // Cálculos Financeiros Finais
  const monthlyProductionKwh = systemSizeKw * 115; // Geração média mensal
  const monthlySavingsValue = monthlyProductionKwh * tariff;
  const annualSavings = monthlySavingsValue * 12;
  const estimatedCost = systemSizeKw * PANEL_PRICE_MARKET;
  const paybackYears = estimatedCost / annualSavings;
  const co2Offset = (monthlyProductionKwh * 12 * CO2_FACTOR) / 1000; // Toneladas

  // Array de economia mensal (Sazonalidade simples - Verão produz mais)
  const seasonality = [1.1, 1.05, 1.0, 0.9, 0.8, 0.75, 0.8, 0.9, 0.95, 1.0, 1.1, 1.15];
  const monthlySavingsArray = seasonality.map(factor => monthlySavingsValue * factor);

  // --- 2. AI TEXT GENERATION (Qualitative) ---
  const dataContext = `
      DADOS TÉCNICOS CALCULADOS:
      - Endereço: ${address}
      - Tarifa usada: R$ ${tariff.toFixed(2)}/kWh
      - Sistema Recomendado: ${systemSizeKw} kWp
      - Economia Anual: R$ ${annualSavings.toLocaleString('pt-BR')}
      - Custo Estimado: R$ ${estimatedCost.toLocaleString('pt-BR')}
      - Payback: ${paybackYears.toFixed(1)} anos
      - Qualidade Telhado: ${roofQuality}
  `;

  const prompt = `
    Atue como um consultor comercial da SolarSavian.
    Analise os dados técnicos abaixo e gere APENAS um resumo JSON.
    NÃO RECALCULE OS NÚMEROS. Use os números fornecidos no contexto.
    
    ${dataContext}

    Gere um JSON com:
    1. "summary": Um parágrafo persuasivo (max 30 palavras) focado no ROI e valorização do imóvel. Use tom profissional e direto.
    2. "roofQuality": Confirme a qualidade do telhado baseada nos dados (Excellent/Good/Fair/Poor).
  `;

  let geminiData: any = { summary: "Economize gerando sua própria energia.", roofQuality: roofQuality };

  try {
    // Tentar Backend
    try {
        const response = await fetch(`${API_BASE_URL}/generate-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelId: "gemini-2.5-flash",
                prompt: prompt,
                config: { temperature: 0.2 }
            })
        });
        if (response.ok) {
            const json = await response.json();
            const parsed = parseGeminiJson(json.text);
            if (parsed.summary) geminiData = parsed;
        } else {
             throw new Error("Backend unavailable");
        }
    } catch (backendErr) {
        // Fallback Client SDK
        console.warn("Using Client SDK for Summary");
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        const parsed = parseGeminiJson(result.text || "");
        if (parsed.summary) geminiData = parsed;
    }
  } catch (e) {
      console.error("AI Generation failed, using default summary", e);
  }

  // --- 3. MERGE & RETURN ---
  return {
      address,
      lat,
      lng,
      annualSavings: Math.round(annualSavings),
      sunlightHours: 2000, // Média Brasil
      systemSizeKw,
      co2OffsetTons: co2Offset,
      estimatedCost: Math.round(estimatedCost),
      paybackPeriodYears: Number(paybackYears.toFixed(1)),
      monthlySavings: monthlySavingsArray,
      summary: geminiData.summary || `Com um sistema de ${systemSizeKw} kWp, você economiza R$ ${Math.round(annualSavings)} por ano.`,
      roofQuality: geminiData.roofQuality || roofQuality,
      roofAreaSqMeters: solarData?.solarPotential?.wholeRoofStats?.areaMeters2 || (systemSizeKw * 6), // ~6m2 por kWp
      localEnergyRate: tariff,
      monthlyBill: monthlyBill,
      maxPanels: maxPanels,
      solarPotential: solarData?.solarPotential
  };
};

export const chatWithSolarExpert = async (history: {role: string, parts: {text: string}[]}[], userMessage: string, context?: string) => {
    // Mantém a lógica existente do chat, pois ele é puramente conversacional
    const systemInstruction = `
        Você é o SolarBot, especialista técnico e comercial.
        Contexto (Dados Calculados): ${context || "Nenhum relatório gerado ainda."}
        Seja curto, direto e use emojis ocasionalmente. Foco em fechar a venda do lead.
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history,
                message: userMessage,
                systemInstruction
            })
        });
        if (!response.ok) throw new Error("Chat Server Error");
        const data = await response.json();
        return data.text;
    } catch (error) {
        // Fallback Client
        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                history,
                config: { systemInstruction }
            });
            const result = await chat.sendMessage({ message: userMessage });
            return result.text;
        } catch (e) {
            return "Estou reconectando meus sistemas solares. Tente novamente em instantes.";
        }
    }
}