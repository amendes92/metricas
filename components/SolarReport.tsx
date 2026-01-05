import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SolarReportData, SolarPanel } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sun, DollarSign, Leaf, BatteryCharging, TreePine, Car, RefreshCw, Layers, Grid3X3, Map as MapIcon, Users, CreditCard, CheckCircle, Loader2, X, MessageCircle } from 'lucide-react';
import { getStaticMapUrl, getApiKey } from '../services/googleMapsService';
import ShadowClockWidget from './ShadowClockWidget';

interface SolarReportProps {
  data: SolarReportData;
  onUnlock: () => void;
  onRecalculate: (newBill: number) => Promise<void>;
}

const SolarReport: React.FC<SolarReportProps> = ({ data, onUnlock, onRecalculate }) => {
  const [billValue, setBillValue] = useState(data.monthlyBill || 300);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'heatmap' | 'panels' | 'shading'>('panels');
  
  // 4D Shading State
  const [timeOfDay, setTimeOfDay] = useState(12); // 12:00
  const [monthOfYear, setMonthOfYear] = useState(0); // 0 = Jan
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Growth Hacking States
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditStep, setCreditStep] = useState<'input' | 'analyzing' | 'approved'>('input');
  const [creditForm, setCreditForm] = useState({ cpf: '', phone: '' });

  // Social Proof Random Number (Stable per render)
  const neighborsCount = useMemo(() => Math.floor(Math.random() * (28 - 12 + 1)) + 12, []);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Animation Loop for 4D Shading
  useEffect(() => {
    if (isPlaying && viewMode === 'shading') {
        animationRef.current = setInterval(() => {
            setTimeOfDay(prev => {
                if (prev >= 18) {
                    setIsPlaying(false);
                    return 6;
                }
                return prev + 0.5; // Increment by 30 mins
            });
        }, 200); // Speed of animation
    } else {
        if (animationRef.current) clearInterval(animationRef.current);
    }
    return () => { if (animationRef.current) clearInterval(animationRef.current); };
  }, [isPlaying, viewMode]);

  // Initialize Standard Maps API (2D Only)
  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
        if (!isMounted) return;
        
        // 2D Map Logic
        if (mapRef.current && window.google && window.google.maps) {
            if (!googleMapInstance.current) {
                try {
                    googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
                        center: { lat: data.lat, lng: data.lng },
                        zoom: 20,
                        mapTypeId: 'satellite',
                        tilt: 0, // No tilt for clearer 2D view
                        disableDefaultUI: true,
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        rotateControl: false,
                        fullscreenControl: false
                    });
                } catch (e) {
                    console.error("Error initializing Google Maps:", e);
                }
            }
            // Update center if data changes
            googleMapInstance.current.setCenter({ lat: data.lat, lng: data.lng });
            updateOverlays();
        }
    };

    if (window.google && window.google.maps) {
        initMap();
    } else {
        const scriptId = 'google-maps-script';
        const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

        if (existingScript) {
             existingScript.addEventListener('load', initMap);
        } else {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${getApiKey()}&libraries=geometry,places`;
            script.async = true;
            script.defer = true;
            script.crossOrigin = "anonymous"; 
            script.onload = () => {
                if (isMounted) initMap();
            };
            script.onerror = (e) => {
                console.error("Google Maps API failed to load", e);
            };
            document.head.appendChild(script);
        }
    }

    return () => {
        isMounted = false;
        const scriptId = 'google-maps-script';
        const existingScript = document.getElementById(scriptId) as HTMLScriptElement;
        if (existingScript) {
            existingScript.removeEventListener('load', initMap);
        }
    };
  }, [data.lat, data.lng, viewMode]);

  // Re-render overlays when 4D params change
  useEffect(() => {
      if (viewMode === 'shading') {
          updateOverlays();
      }
  }, [timeOfDay, monthOfYear]);

  // Helper to interpolate colors for Heatmap
  const getHeatmapColor = (normalizedValue: number) => {
    if (normalizedValue < 0.5) {
        const t = normalizedValue * 2; 
        const r = Math.floor(59 + (234 - 59) * t);
        const g = Math.floor(130 + (179 - 130) * t);
        const b = Math.floor(246 + (8 - 246) * t);
        return `rgb(${r},${g},${b})`;
    } else {
        const t = (normalizedValue - 0.5) * 2;
        const r = Math.floor(234 + (239 - 234) * t);
        const g = Math.floor(179 + (68 - 179) * t);
        const b = Math.floor(8 + (68 - 8) * t);
        return `rgb(${r},${g},${b})`;
    }
  };

  // Physics Engine for Solar Intensity (South Hemisphere/Brazil focus)
  const calculateSolarIntensity = (panelAzimuth: number, hour: number, month: number) => {
      // 1. Sun Position Calculation (Simplified)
      // Hour 6 = East (90deg), Hour 12 = North (0/360deg), Hour 18 = West (270deg)
      // We map hours 6-18 to degrees roughly.
      
      // Map hour (6-18) to Sun Azimuth (90 -> 0 -> 270)
      // Note: In South Hemisphere, sun passes through North.
      let sunAzimuth = 0;
      if (hour < 12) {
          // Morning: East (90) moving to North (0)
          // Progress 0 (6am) to 1 (12pm)
          const progress = (hour - 6) / 6; 
          sunAzimuth = 90 - (90 * progress);
      } else {
          // Afternoon: North (360/0) moving to West (270)
          // Progress 0 (12pm) to 1 (18pm)
          const progress = (hour - 12) / 6;
          sunAzimuth = 360 - (90 * progress);
      }

      // 2. Angular Difference
      // Calculate delta between Panel Azimuth and Sun Azimuth
      // Normalize angles to 0-360
      const pAz = (panelAzimuth + 360) % 360;
      const sAz = (sunAzimuth + 360) % 360;
      
      let delta = Math.abs(pAz - sAz);
      if (delta > 180) delta = 360 - delta;

      // 3. Intensity base on angle (Cosine similarity-ish)
      // If delta is 0 (direct hit), intensity is high. If delta is 90, intensity low.
      // Max intensity window: +/- 70 degrees
      let angleIntensity = Math.max(0, 1 - (delta / 80)); 

      // 4. Seasonality (Month)
      // Summer (Dec/Jan) = High sun, less shadows. Winter (Jun/Jul) = Low sun, long shadows.
      // Brazil: Summer is months 0, 1, 11. Winter is 5, 6, 7.
      const distFromWinter = Math.abs(month - 6); // 0 in June, 6 in Dec
      const seasonalFactor = 0.6 + (distFromWinter / 6) * 0.4; // 0.6 in Winter, 1.0 in Summer

      // 5. Time of Day intensity (Bell curve)
      // Noon is stronger than dawn/dusk
      const timeFactor = Math.sin(((hour - 6) / 12) * Math.PI);

      return angleIntensity * seasonalFactor * timeFactor;
  };

  const updateOverlays = () => {
    if (!window.google || !window.google.maps || !googleMapInstance.current || !data.solarPotential) return;

    if (overlaysRef.current) {
        overlaysRef.current.forEach(o => o.setMap(null));
    }
    overlaysRef.current = [];

    const solarPotential = data.solarPotential;
    
    if (!solarPotential.solarPanelConfigs || solarPotential.solarPanelConfigs.length === 0) {
        return;
    }

    const bestConfig = solarPotential.solarPanelConfigs.reduce((prev, current) => 
        (prev.panelsCount > current.panelsCount) ? prev : current
    , solarPotential.solarPanelConfigs[0]);

    if (!bestConfig.solarPanels || !Array.isArray(bestConfig.solarPanels)) {
        return;
    }

    const allPanelsEnergy = bestConfig.solarPanels.map(p => p.yearlyEnergyDcKwh);
    const minEnergy = Math.min(...allPanelsEnergy);
    const maxEnergy = Math.max(...allPanelsEnergy);

    bestConfig.solarPanels.forEach((panel: SolarPanel) => {
            const segment = solarPotential.roofSegmentStats[panel.segmentIndex];
            const azimuth = segment ? segment.azimuthDegrees : 0;
            const paths = getPanelVertices(panel.center, panel.orientation, azimuth);
            
            let fillColor = '#3b82f6';
            let strokeColor = '#2563eb';
            let fillOpacity = 0.6;
            let strokeWeight = 1;

            if (viewMode === 'heatmap') {
                const range = maxEnergy - minEnergy || 1;
                const norm = (panel.yearlyEnergyDcKwh - minEnergy) / range;
                fillColor = getHeatmapColor(norm);
                strokeColor = fillColor; 
                fillOpacity = 0.75; 
                strokeWeight = 0.5;
            } else if (viewMode === 'shading') {
                // 4D Visualization Logic
                const intensity = calculateSolarIntensity(azimuth, timeOfDay, monthOfYear);
                
                // Base efficiency from API data (so bad panels are always dimmer)
                const range = maxEnergy - minEnergy || 1;
                const efficiencyBase = (panel.yearlyEnergyDcKwh - minEnergy) / range;
                
                const finalIntensity = intensity * (0.5 + 0.5 * efficiencyBase);

                // Golden/Yellow for sun, Dark Blue/Black for shade
                if (finalIntensity > 0.6) {
                    fillColor = '#facc15'; // Sunny Yellow
                    fillOpacity = finalIntensity * 0.8;
                    strokeColor = '#eab308';
                } else {
                    fillColor = '#1e293b'; // Shadow Slate
                    fillOpacity = 0.8 - finalIntensity; // Darker when less sun
                    strokeColor = '#0f172a';
                }
                strokeWeight = 0;
            }

            try {
                const polygon = new window.google.maps.Polygon({
                    paths: paths,
                    strokeColor: strokeColor,
                    strokeOpacity: viewMode === 'shading' ? 0.3 : 0.9,
                    strokeWeight: strokeWeight,
                    fillColor: fillColor,
                    fillOpacity: fillOpacity,
                    map: googleMapInstance.current
                });
                overlaysRef.current.push(polygon);
            } catch (e) {
                console.warn("Error creating polygon", e);
            }
    });
  };

  const getPanelVertices = (center: {latitude: number, longitude: number}, orientation: string, azimuth: number) => {
    const w = orientation === 'LANDSCAPE' ? 1.65 : 1.0;
    const h = orientation === 'LANDSCAPE' ? 1.0 : 1.65;
    const theta = (azimuth * Math.PI) / 180;
    
    const corners = [
        { x: -w/2, y: h/2 },
        { x: w/2, y: h/2 },
        { x: w/2, y: -h/2 },
        { x: -w/2, y: -h/2 }
    ];

    return corners.map(p => {
        const rx = p.x * Math.cos(theta) - p.y * Math.sin(theta);
        const ry = p.x * Math.sin(theta) + p.y * Math.cos(theta);
        const dLat = ry / 111320;
        const dLng = rx / (111320 * Math.cos(center.latitude * Math.PI / 180));
        return { lat: center.latitude + dLat, lng: center.longitude + dLng };
    });
  };

  // --- Growth Actions ---

  const handleWhatsAppClick = () => {
    // Format message
    const savings = data.annualSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const address = data.address.split(',')[0]; // Short address
    const message = `Olá, vi o relatório da minha casa na ${address} e quero validar a economia de R$ ${savings}/ano.`;
    
    // Replace with your real sales number
    const phoneNumber = "5511999999999"; 
    
    const link = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
  };

  const handleCreditCheck = (e: React.FormEvent) => {
      e.preventDefault();
      setCreditStep('analyzing');
      // Simulate API call
      setTimeout(() => {
          setCreditStep('approved');
      }, 2500);
  };

  // ----------------------

  const safeMonthlySavings = Array.isArray(data.monthlySavings) ? data.monthlySavings : Array(12).fill(0);

  const chartData = safeMonthlySavings.map((val, idx) => ({
    name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][idx],
    savings: val,
  }));

  const loanTermMonths = 60; 
  const interestRate = 0.015;
  const monthlyPayment = (data.estimatedCost * interestRate) / (1 - Math.pow(1 + interestRate, -loanTermMonths));
  const newBill = Math.max(50, billValue - (data.annualSavings / 12));
  const totalMonthlyCostSolar = monthlyPayment + newBill;

  const handleBillChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillValue(Number(e.target.value));
  };

  const handleUpdateClick = async () => {
    setIsUpdating(true);
    await onRecalculate(billValue);
    setIsUpdating(false);
  };

  const hasSolarData = !!data.solarPotential;
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in-up pb-20">
      
      {/* Banner de Escassez / Prova Social */}
      <div className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 animate-pulse-slow">
         <Users className="w-5 h-5 text-blue-200" />
         <p className="font-medium text-sm md:text-base text-center">
            🔥 <strong>{neighborsCount} vizinhos</strong> no seu bairro analisaram o potencial solar esta semana.
         </p>
      </div>

      {/* Header with Map Container */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900 h-[500px] group transition-all duration-500">
        
        {/* Render 2D Map or Fallback Image */}
        {hasSolarData ? (
            <div ref={mapRef} className="w-full h-full opacity-100" />
        ) : (
            <img 
                src={getStaticMapUrl(data.lat, data.lng, 20, '1200x800')} 
                alt="Satellite View" 
                className="w-full h-full object-cover opacity-80"
            />
        )}
        
        {/* Heatmap Legend */}
        {viewMode === 'heatmap' && (
            <div className="absolute top-20 right-4 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 w-44 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-3 h-3 text-orange-500" />
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Potencial de Energia</p>
                </div>
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 mb-1"></div>
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Baixo</span>
                    <span>Médio</span>
                    <span>Alto</span>
                </div>
            </div>
        )}

        {/* 4D Shading Widget Integration */}
        {viewMode === 'shading' && (
            <ShadowClockWidget 
                timeOfDay={timeOfDay}
                monthOfYear={monthOfYear}
                isPlaying={isPlaying}
                onTimeChange={setTimeOfDay}
                onMonthChange={setMonthOfYear}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
            />
        )}

        {/* View Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button 
                onClick={() => setViewMode('panels')}
                className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-md ${viewMode === 'panels' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
                title="Layout dos Painéis"
            >
                <Grid3X3 className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setViewMode('heatmap')}
                className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-md ${viewMode === 'heatmap' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
                title="Mapa de Calor (Irradiação)"
            >
                <Layers className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setViewMode('shading')}
                className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-md ${viewMode === 'shading' ? 'bg-yellow-400 border-yellow-300 text-yellow-900' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
                title="Simulação 4D (Time-lapse)"
            >
                <Sun className="w-5 h-5" />
            </button>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-0 left-0 p-8 z-10 text-white w-full pointer-events-none bg-gradient-to-t from-slate-900/90 to-transparent">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                            {data.roofQuality === 'Excellent' ? 'Telhado Premium' : 'Análise Técnica'}
                        </span>
                        {hasSolarData && (
                            <span className="flex items-center gap-1 text-green-400 text-xs bg-green-900/50 px-2 py-1 rounded-md border border-green-500/30">
                                <Layers className="w-3 h-3" /> {data.solarPotential?.solarPanelConfigs?.[0]?.panelsCount || data.solarPotential?.maxArrayPanelsCount} Painéis
                             </span>
                        )}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                        {data.address.split(',')[0]}
                    </h2>
                    <p className="opacity-90 text-lg flex items-center gap-2 text-slate-300">
                        <MapIcon className="w-4 h-4" /> 
                        {viewMode === 'heatmap' ? 'Análise de Irradiação Solar' : viewMode === 'shading' ? 'Simulação de Luz Solar' : 'Layout Sugerido de Instalação'}
                    </p>
                </div>
                
                {data.localEnergyRate && (
                    <div className="text-right bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-300 uppercase tracking-widest mb-1">Tarifa Local</p>
                        <p className="text-2xl font-bold text-yellow-400">R$ {data.localEnergyRate.toFixed(2)}<span className="text-sm text-white">/kWh</span></p>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-bl-full -mr-16 -mt-16 z-0"></div>
                <p className="text-slate-700 text-xl font-light italic leading-relaxed relative z-10">
                    "{data.summary}"
                </p>
            </div>

            {/* Interactive Calculator */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Calculadora de Investimento</h3>
                        <p className="text-slate-500 text-sm">Ajuste conforme sua conta real.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-slate-900">R$ {billValue}</span>
                        <p className="text-xs text-slate-400">mensais</p>
                    </div>
                </div>
                <input 
                    type="range" 
                    min="100" 
                    max="2000" 
                    step="50" 
                    value={billValue} 
                    onChange={handleBillChange}
                    className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500 mb-8"
                />
                <button 
                    onClick={handleUpdateClick}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl hover:bg-slate-800 transition-all active:scale-[0.99] disabled:opacity-70 shadow-lg shadow-slate-900/10"
                >
                    <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
                    {isUpdating ? 'Recalculando com IA...' : 'Atualizar Estimativa'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard 
                    icon={<DollarSign className="w-6 h-6 text-green-600" />} 
                    label="Economia Anual" 
                    value={`R$ ${data.annualSavings.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                    color="green"
                />
                <StatCard 
                    icon={<Sun className="w-6 h-6 text-yellow-600" />} 
                    label="Horas de Sol" 
                    value={`${data.sunlightHours.toLocaleString('pt-BR')} h/ano`}
                    color="yellow"
                />
                <StatCard 
                    icon={<Layers className="w-6 h-6 text-blue-600" />} 
                    label="Área Útil Telhado" 
                    value={`${data.solarPotential ? data.solarPotential.wholeRoofStats.areaMeters2.toFixed(0) : (data.roofAreaSqMeters || 45)} m²`}
                    color="blue"
                />
                <StatCard 
                    icon={<BatteryCharging className="w-6 h-6 text-purple-600" />} 
                    label="Capacidade" 
                    value={`${data.systemSizeKw} kWp`}
                    color="purple"
                />
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 px-2">Fluxo de Caixa Acumulado</h3>
                <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis hide />
                    <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, 'Economia']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="savings" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="url(#colorGradient)" />
                        ))}
                    </Bar>
                    <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={1}/>
                        </linearGradient>
                    </defs>
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
            
            {/* Financing Simulator Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Comparativo Mensal</h3>
                <div className="relative">
                    <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-slate-100"></div>
                    
                    <div className="relative flex items-center gap-4 mb-6">
                        <div className="bg-red-100 p-3 rounded-full z-10">
                            <DollarSign className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-bold">Hoje</p>
                            <p className="text-xl font-bold text-slate-800">R$ {billValue}</p>
                            <p className="text-xs text-red-500">Dinheiro perdido</p>
                        </div>
                    </div>

                    <div className="relative flex items-center gap-4">
                        <div className="bg-green-100 p-3 rounded-full z-10">
                            <Sun className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-bold">Com Solar (Financiado)</p>
                            <p className="text-xl font-bold text-green-700">R$ {totalMonthlyCostSolar.toFixed(0)}</p>
                            <p className="text-xs text-green-500">Investimento em patrimônio</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center">
                     <p className="text-xs text-slate-400 text-center mb-3">
                        *Baseado em 60x com juros de 1.5% a.m.
                    </p>
                    <button 
                        onClick={() => { setCreditStep('input'); setShowCreditModal(true); }}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-bold bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
                    >
                        <CreditCard className="w-3 h-3" /> Verificar aprovação de crédito
                    </button>
                </div>
            </div>

            {/* Environmental Impact */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-400" />
                        Seu Legado
                    </h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 p-3 rounded-2xl">
                                <TreePine className="w-8 h-8 text-green-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{(data.co2OffsetTons * 15).toFixed(0)}</p>
                                <p className="text-xs text-slate-300 uppercase tracking-wider">Árvores Plantadas</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 p-3 rounded-2xl">
                                <Car className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{(data.co2OffsetTons * 2500).toLocaleString('pt-BR')}</p>
                                <p className="text-xs text-slate-300 uppercase tracking-wider">Km Evitados</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call to Action - WhatsApp Conversion */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 text-white text-center shadow-lg shadow-green-500/20 transform hover:scale-[1.02] transition-transform">
                <h3 className="text-2xl font-bold mb-2">Garanta essa Economia</h3>
                <p className="text-white/90 mb-8">
                    Fale agora com um especialista e valide este projeto para sua casa.
                </p>
                <button 
                    onClick={handleWhatsAppClick}
                    className="w-full bg-white text-green-700 font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                >
                    <MessageCircle className="w-5 h-5" />
                    Receber Proposta no WhatsApp
                </button>
                <p className="text-[10px] text-green-100 mt-3">Resposta média: 5 minutos</p>
            </div>

        </div>

      </div>

      {/* Credit Simulator Modal */}
      {showCreditModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in relative">
                  <button onClick={() => setShowCreditModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                  </button>
                  
                  <div className="bg-slate-900 p-6 text-white text-center">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                      <h3 className="text-xl font-bold">Pré-Aprovação</h3>
                      <p className="text-slate-300 text-xs">Simulação sem compromisso.</p>
                  </div>

                  <div className="p-6">
                      {creditStep === 'input' && (
                          <form onSubmit={handleCreditCheck} className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
                                  <input 
                                    type="text" 
                                    required
                                    placeholder="000.000.000-00"
                                    className="w-full border-b-2 border-slate-200 py-2 focus:border-blue-500 outline-none transition-colors"
                                    value={creditForm.cpf}
                                    onChange={e => setCreditForm({...creditForm, cpf: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Celular</label>
                                  <input 
                                    type="tel" 
                                    required
                                    placeholder="(11) 99999-9999"
                                    className="w-full border-b-2 border-slate-200 py-2 focus:border-blue-500 outline-none transition-colors"
                                    value={creditForm.phone}
                                    onChange={e => setCreditForm({...creditForm, phone: e.target.value})}
                                  />
                              </div>
                              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors mt-4">
                                  Verificar Crédito
                              </button>
                          </form>
                      )}

                      {creditStep === 'analyzing' && (
                          <div className="text-center py-8">
                              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                              <p className="font-bold text-slate-700">Consultando Score...</p>
                              <p className="text-xs text-slate-400">Conectando aos bureaus de crédito.</p>
                          </div>
                      )}

                      {creditStep === 'approved' && (
                          <div className="text-center py-4">
                              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <CheckCircle className="w-6 h-6 text-green-600" />
                              </div>
                              <h4 className="text-xl font-bold text-green-700 mb-2">Pré-Aprovado!</h4>
                              <p className="text-sm text-slate-600 mb-4">
                                  Temos uma linha de crédito disponível para o seu perfil com carência de 90 dias.
                              </p>
                              <button 
                                onClick={handleWhatsAppClick}
                                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors"
                              >
                                  Finalizar no WhatsApp
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

const StatCard = ({ icon, label, value, color }: any) => {
    const bgColors: any = {
        green: 'bg-green-50 border-green-100',
        yellow: 'bg-yellow-50 border-yellow-100',
        blue: 'bg-blue-50 border-blue-100',
        purple: 'bg-purple-50 border-purple-100'
    };
    
    return (
        <div className={`${bgColors[color]} p-5 rounded-2xl border`}>
            <div className="mb-3 bg-white w-fit p-2 rounded-lg shadow-sm">{icon}</div>
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">{label}</p>
            <p className="text-lg md:text-xl font-bold text-slate-900">{value}</p>
        </div>
    );
};

export default SolarReport;