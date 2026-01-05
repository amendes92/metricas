import React, { useState, useEffect, useRef } from 'react';
import { SolarReportData, SolarPanel } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sun, DollarSign, Leaf, BatteryCharging, TreePine, Car, RefreshCw, Layers, Grid3X3, Video, Map as MapIcon, Rotate3D } from 'lucide-react';
import { getStaticMapUrl, getApiKey } from '../services/googleMapsService';

interface SolarReportProps {
  data: SolarReportData;
  onUnlock: () => void;
  onRecalculate: (newBill: number) => Promise<void>;
}

declare global {
    interface Window {
        google: any;
        initMap: () => void;
    }
    namespace JSX {
        interface IntrinsicElements {
            'gmp-map-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                center?: string; // lat,lng string or object
                tilt?: string | number;
                heading?: string | number;
                range?: string | number;
                'default-labels-disabled'?: boolean | string;
            };
            'gmp-marker-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                position?: string;
                'altitude-mode'?: string;
            };
        }
    }
}

const SolarReport: React.FC<SolarReportProps> = ({ data, onUnlock, onRecalculate }) => {
  const [billValue, setBillValue] = useState(data.monthlyBill || 300);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'cinematic' | 'heatmap' | 'panels'>('panels');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const map3dRef = useRef<any>(null); // Ref for gmp-map-3d element
  const googleMapInstance = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);

  // Initialize Maps API (Now including maps3d library)
  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
        if (!isMounted) return;
        if (viewMode !== 'cinematic' && !mapRef.current) return;
        
        // 2D Map Logic
        if (viewMode !== 'cinematic' && mapRef.current && window.google && window.google.maps) {
            if (!googleMapInstance.current) {
                try {
                    googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
                        center: { lat: data.lat, lng: data.lng },
                        zoom: 20,
                        mapTypeId: 'satellite',
                        tilt: 0,
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
            updateOverlays();
        }
    };

    // Check if API loaded, if not load with specific params for 3D
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
            // IMPORTANT: v=beta and libraries=maps3d are required for Photorealistic 3D Tiles
            // Dynamically fetching key
            script.src = `https://maps.googleapis.com/maps/api/js?key=${getApiKey()}&v=beta&libraries=maps3d,geometry,places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                if (isMounted) initMap();
            };
            script.onerror = (e) => {
                console.error("Google Maps API failed to load", e);
                // Try to handle script error gracefully?
            };
            document.head.appendChild(script);
        }
    }

    return () => {
        isMounted = false;
        // Cleanup listener if possible, though standard addEventListener on element doesn't have easy removal without ref to function
        const scriptId = 'google-maps-script';
        const existingScript = document.getElementById(scriptId) as HTMLScriptElement;
        if (existingScript) {
            existingScript.removeEventListener('load', initMap);
        }
    };
  }, [data.lat, data.lng, viewMode]);

  // Animation Logic for 3D Mode
  useEffect(() => {
      if (viewMode === 'cinematic' && map3dRef.current) {
          let angle = 0;
          const animate = () => {
              if (map3dRef.current) {
                  angle = (angle + 0.1) % 360; // Smooth rotation
                  map3dRef.current.heading = angle;
              }
              animationRef.current = requestAnimationFrame(animate);
          };
          animationRef.current = requestAnimationFrame(animate);
      } else {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      }
      return () => {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
  }, [viewMode]);

  const updateOverlays = () => {
    if (!window.google || !window.google.maps || !googleMapInstance.current || !data.solarPotential) return;

    // Clear existing overlays
    if (overlaysRef.current) {
        overlaysRef.current.forEach(o => o.setMap(null));
    }
    overlaysRef.current = [];

    const solarPotential = data.solarPotential;
    
    // Safety check for configs
    if (!solarPotential.solarPanelConfigs || solarPotential.solarPanelConfigs.length === 0) {
        return;
    }

    const bestConfig = solarPotential.solarPanelConfigs.reduce((prev, current) => 
        (prev.panelsCount > current.panelsCount) ? prev : current
    , solarPotential.solarPanelConfigs[0]);

    // Safety check for solarPanels array
    if (!bestConfig.solarPanels || !Array.isArray(bestConfig.solarPanels)) {
        return;
    }

    const allPanelsEnergy = bestConfig.solarPanels.map(p => p.yearlyEnergyDcKwh);
    const minEnergy = Math.min(...allPanelsEnergy);
    const maxEnergy = Math.max(...allPanelsEnergy);

    if (viewMode === 'panels' || viewMode === 'heatmap') {
        bestConfig.solarPanels.forEach((panel: SolarPanel) => {
             const segment = solarPotential.roofSegmentStats[panel.segmentIndex];
             const azimuth = segment ? segment.azimuthDegrees : 0;
             const paths = getPanelVertices(panel.center, panel.orientation, azimuth);
             
             let fillColor = '#3b82f6';
             let strokeColor = '#2563eb';
             let fillOpacity = 0.6;

             if (viewMode === 'heatmap') {
                const norm = (panel.yearlyEnergyDcKwh - minEnergy) / (maxEnergy - minEnergy || 1);
                const g = Math.floor(255 * (1 - norm));
                fillColor = `rgb(255, ${g}, 0)`;
                strokeColor = `rgb(200, ${g}, 0)`;
                fillOpacity = 0.8;
             }

             try {
                const polygon = new window.google.maps.Polygon({
                    paths: paths,
                    strokeColor: strokeColor,
                    strokeOpacity: 0.8,
                    strokeWeight: 1,
                    fillColor: fillColor,
                    fillOpacity: fillOpacity,
                    map: googleMapInstance.current
                });
                overlaysRef.current.push(polygon);
             } catch (e) {
                console.warn("Error creating polygon", e);
             }
        });
    }
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

  // Safe access to monthlySavings
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
      
      {/* Header with Map Container */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900 h-[500px] group transition-all duration-500">
        
        {/* Render Logic: 3D Mode vs 2D Mode */}
        {viewMode === 'cinematic' ? (
             <div className="w-full h-full animate-fade-in">
                 <gmp-map-3d 
                    ref={map3dRef}
                    center={`${data.lat},${data.lng}`} 
                    range="400" 
                    tilt="60" 
                    heading="0"
                    style={{width: '100%', height: '100%'}}
                 >
                     {/* Marker anchored to the 3D mesh */}
                     <gmp-marker-3d position={`${data.lat},${data.lng}`} altitude-mode="RELATIVE_TO_MESH">
                        <div className="bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white transform -translate-y-8 flex flex-col items-center">
                            <span>Sua Casa</span>
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-orange-600 absolute -bottom-2"></div>
                        </div>
                     </gmp-marker-3d>
                 </gmp-map-3d>
                 <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                     <span className="text-white text-xs font-bold flex items-center gap-2">
                         <Rotate3D className="w-3 h-3 animate-spin-slow" /> 
                         3D Imersivo (Photorealistic Tiles)
                     </span>
                 </div>
             </div>
        ) : (
            hasSolarData ? (
                <div ref={mapRef} className="w-full h-full opacity-100" />
            ) : (
                <img 
                    src={getStaticMapUrl(data.lat, data.lng, 20, '1200x800')} 
                    alt="Satellite View" 
                    className="w-full h-full object-cover opacity-80"
                />
            )
        )}
        
        {/* View Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button 
                onClick={() => setViewMode('cinematic')}
                className={`p-3 rounded-full backdrop-blur-md border transition-all ${viewMode === 'cinematic' ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/50' : 'bg-black/60 border-transparent text-slate-300 hover:bg-black/80'}`}
                title="Imersão 3D"
            >
                <Video className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setViewMode('heatmap')}
                className={`p-3 rounded-full backdrop-blur-md border transition-all ${viewMode === 'heatmap' ? 'bg-orange-500/90 border-orange-400 text-white' : 'bg-black/60 border-transparent text-slate-300 hover:bg-black/80'}`}
                title="Mapa de Irradiação (Heatmap)"
            >
                <Sun className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setViewMode('panels')}
                className={`p-3 rounded-full backdrop-blur-md border transition-all ${viewMode === 'panels' ? 'bg-blue-500/90 border-blue-400 text-white' : 'bg-black/60 border-transparent text-slate-300 hover:bg-black/80'}`}
                title="Layout dos Painéis"
            >
                <Grid3X3 className="w-5 h-5" />
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
                        {hasSolarData && viewMode !== 'cinematic' && (
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
                        {viewMode === 'cinematic' ? 'Tour Virtual 360º' : viewMode === 'heatmap' ? 'Análise de Irradiação' : 'Layout Sugerido'}
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
            
            {/* Financing Simulator */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
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
                <div className="mt-6 pt-6 border-t border-slate-100">
                     <p className="text-xs text-slate-400 text-center">
                        *Baseado em 60x com juros de 1.5% a.m.
                    </p>
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

            {/* Call to Action */}
            <div className="bg-gradient-to-br from-orange-500 to-yellow-500 rounded-3xl p-8 text-white text-center shadow-lg shadow-orange-500/20 transform hover:scale-[1.02] transition-transform">
                <h3 className="text-2xl font-bold mb-2">Gostou dos números?</h3>
                <p className="text-white/90 mb-8">
                    Receba 3 orçamentos gratuitos de instaladores certificados na sua região.
                </p>
                <button 
                onClick={onUnlock}
                className="w-full bg-white text-orange-600 font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-orange-50 transition-colors"
                >
                Solicitar Orçamentos
                </button>
            </div>

        </div>

      </div>
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