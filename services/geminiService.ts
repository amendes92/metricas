import { GoogleGenAI } from "@google/genai";
import { SolarReportData } from "../types";

// Initialize Gemini Client
// IMPORTANT: The API key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSolarReport = async (address: string): Promise<SolarReportData> => {
  try {
    const modelId = "gemini-2.5-flash"; // Using 2.5 Flash for Maps Grounding support

    const prompt = `
      Atue como um especialista em energia solar e analista de dados focado no mercado brasileiro.
      Preciso de um relatório detalhado de potencial solar para o seguinte endereço: "${address}".

      Use seu conhecimento sobre a latitude do local, padrões climáticos típicos e irradiação solar para estimar os valores.
      Considere os custos e tarifas de energia do Brasil (BRL/R$).
      
      Retorne um objeto JSON embutido em um bloco de código. O JSON deve seguir estritamente esta estrutura:
      {
        "address": "${address}",
        "annualSavings": number (economia anual estimada em Reais BRL),
        "sunlightHours": number (estimativa de horas de sol pleno por ano),
        "systemSizeKw": number (tamanho recomendado do sistema em kW),
        "co2OffsetTons": number (estimativa anual de compensação de CO2 em toneladas métricas),
        "estimatedCost": number (custo estimado de instalação em Reais BRL antes de incentivos),
        "paybackPeriodYears": number (anos para retorno do investimento - ROI),
        "monthlySavings": [number, number, ... 12 valores representando a economia de Jan a Dez em Reais],
        "summary": "Um resumo breve e encorajador sobre o potencial solar desta casa (máximo 2 frases) em Português do Brasil."
      }
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }], // Use Maps Grounding to verify location
        temperature: 0.4, // Lower temperature for more consistent numerical estimates
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Nenhuma resposta gerada pelo Gemini.");
    }

    // Extract JSON from markdown code block
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
    let jsonStr = jsonMatch[1];
    
    // Fallback cleanup if strict regex fails but looks like JSON
    if (!jsonStr) {
       jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    }

    const data = JSON.parse(jsonStr.trim()) as SolarReportData;
    
    // Ensure monthlySavings is valid for the chart
    if (!data.monthlySavings || data.monthlySavings.length !== 12) {
      data.monthlySavings = Array(12).fill(data.annualSavings / 12);
    }

    return data;
  } catch (error) {
    console.error("Error generating solar report:", error);
    // Return a fallback mock if AI fails (for graceful degradation in demo)
    // In production, this should throw
    throw error;
  }
};