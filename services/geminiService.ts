import { GoogleGenAI } from "@google/genai";
import { SolarReportData } from "../types";

// Robust API Key retrieval
const getUserKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // process is not defined
  }
  return 'AIzaSyDnPfZQAuZP9Hl3S734fvXM1q4UrxhXZ-w';
};

const ai = new GoogleGenAI({ apiKey: getUserKey() });

export const generateSolarReportWithData = async (
  address: string, 
  lat: number, 
  lng: number, 
  solarData: any | null,
  monthlyBill: number = 300 // Default bill in BRL
): Promise<SolarReportData> => {
  
  const modelId = "gemini-2.5-flash"; 

  let dataContext = "";
  if (solarData) {
    dataContext = `
      Eu tenho DADOS REAIS da Google Solar API (Building Insights) para este local:
      - Máximo de painéis possíveis: ${solarData.solarPotential.maxArrayPanelsCount}
      - Capacidade máxima do painel (Watts): ${solarData.solarPotential.maxArrayPanelsCount * 400} (estimado 400W/painel)
      - Área do telhado (m2): ${solarData.solarPotential.wholeRoofStats.areaMeters2}
      - Segmentos de telhado: ${solarData.solarPotential.roofSegmentStats.length} segmentos analisados.
    `;
  } else {
    dataContext = `
      Não tenho dados da Solar API para este local específico. Faça uma estimativa técnica.
    `;
  }

  const prompt = `
    Atue como um engenheiro solar sênior no Brasil.
    Endereço: "${address}" (Lat: ${lat}, Lng: ${lng}).
    Conta de Luz Mensal: R$ ${monthlyBill}.
    
    ${dataContext}

    TAREFA:
    1. Pesquise a tarifa de energia (R$/kWh) atual para a cidade/estado deste endereço usando a ferramenta de busca (Google Search).
    2. Calcule a economia baseada nessa tarifa real.
    3. Determine a qualidade do telhado (Excellent/Good/Fair/Poor) baseado na irradiação e área.

    Retorne APENAS um JSON válido com esta estrutura:
    {
      "address": "${address}",
      "annualSavings": number (R$),
      "sunlightHours": number (horas/ano),
      "systemSizeKw": number,
      "co2OffsetTons": number,
      "estimatedCost": number,
      "paybackPeriodYears": number,
      "monthlySavings": [number... 12 meses],
      "summary": "Resumo técnico e comercial persuasivo em PT-BR.",
      "roofQuality": "Excellent" | "Good" | "Fair" | "Poor",
      "roofAreaSqMeters": number,
      "localEnergyRate": number (o valor da tarifa encontrada)
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { 
          temperature: 0.2,
          tools: [{ googleSearch: {} }] 
      }, 
    });

    const text = response.text || "";
    // Robust JSON extraction
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
    let jsonStr = jsonMatch[1] || text;
    
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    if (jsonStr.startsWith('json')) jsonStr = jsonStr.substring(4);
    
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    const data = JSON.parse(jsonStr) as SolarReportData;
    
    data.lat = lat;
    data.lng = lng;
    data.monthlyBill = monthlyBill;

    data.maxPanels = solarData?.solarPotential?.maxArrayPanelsCount || Math.ceil((data.systemSizeKw * 1000) / 400);

    if (!data.monthlySavings || data.monthlySavings.length !== 12) {
      data.monthlySavings = Array(12).fill(data.annualSavings / 12);
    }

    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Falha na inteligência artificial ao gerar o relatório. Tente novamente.");
  }
};

export const chatWithSolarExpert = async (history: {role: string, parts: {text: string}[]}[], userMessage: string, context?: string) => {
    const modelId = "gemini-2.5-flash";
    const systemInstruction = `
        Você é o SolarBot, assistente da SolarSavian.
        Contexto Atual do Usuário (se houver): ${context || "Nenhum relatório gerado ainda."}
        Responda dúvidas sobre o relatório acima, inversores, baterias e financiamento no Brasil.
    `;

    const chat = ai.chats.create({
        model: modelId,
        history: history,
        config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }]
        }
    });
    
    const result = await chat.sendMessage({ message: userMessage });
    return result.text;
}
