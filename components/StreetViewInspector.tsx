import React, { useEffect, useRef, useState } from 'react';
import { Eye, CheckSquare, Save, X, AlertTriangle, TreePine, Zap, Home } from 'lucide-react';
import { InspectionData } from '../types';

interface StreetViewInspectorProps {
  lat: number;
  lng: number;
  initialData?: InspectionData;
  onSave: (data: InspectionData) => void;
  onClose: () => void;
}

const StreetViewInspector: React.FC<StreetViewInspectorProps> = ({ lat, lng, initialData, onSave, onClose }) => {
  const panoRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [form, setForm] = useState<InspectionData>(initialData || {
    hasTree: false,
    hasPole: false,
    roofVisible: true,
    accessNotes: '',
    inspectedAt: new Date().toISOString()
  });

  useEffect(() => {
    if (!window.google || !window.google.maps || !panoRef.current) {
        setError("Google Maps API não carregada.");
        return;
    }

    const streetViewService = new window.google.maps.StreetViewService();
    const radius = 50; // Search within 50 meters

    streetViewService.getPanorama({ location: { lat, lng }, radius }, (data: any, status: any) => {
        if (status === 'OK' && data) {
            const panorama = new window.google.maps.StreetViewPanorama(panoRef.current as HTMLElement, {
                position: data.location.latLng,
                pov: {
                    heading: 34, // Generic starting heading
                    pitch: 10,
                },
                zoom: 1,
                addressControl: false,
                showRoadLabels: false,
                disableDefaultUI: true,
                zoomControl: true,
                panControl: true,
            });
            // Try to calculate heading towards the house
            const housePos = new window.google.maps.LatLng(lat, lng);
            const carPos = data.location.latLng;
            const heading = window.google.maps.geometry.spherical.computeHeading(carPos, housePos);
            panorama.setPov({ heading: heading, pitch: 0 });

        } else {
            setError("Street View não disponível para este local.");
        }
    });
  }, [lat, lng]);

  const handleSave = () => {
    onSave({
        ...form,
        inspectedAt: new Date().toISOString()
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden relative">
      
      {/* Header */}
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 z-10">
          <div className="flex items-center gap-2 text-white">
              <Eye className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold">Vistoria Virtual da Fachada</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
          </button>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row h-[600px]">
          
          {/* Street View Container */}
          <div className="flex-1 relative bg-black">
              {error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                      <AlertTriangle className="w-12 h-12 mb-2 text-yellow-500" />
                      <p>{error}</p>
                  </div>
              ) : (
                  <div ref={panoRef} className="w-full h-full" />
              )}
          </div>

          {/* Inspection Controls Sidebar */}
          <div className="w-full md:w-80 bg-slate-50 border-l border-slate-200 p-6 overflow-y-auto flex flex-col z-20 shadow-2xl">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Checklist de Acesso
              </h4>

              <div className="space-y-4 flex-1">
                  
                  {/* Obstacles */}
                  <div className="space-y-3">
                      <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${form.hasTree ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <input 
                              type="checkbox" 
                              checked={form.hasTree} 
                              onChange={e => setForm({...form, hasTree: e.target.checked})}
                              className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                          />
                          <div className="ml-3">
                              <span className="block text-sm font-medium text-slate-900 flex items-center gap-2">
                                  <TreePine className="w-4 h-4 text-slate-500" /> Árvore na Frente?
                              </span>
                          </div>
                      </label>

                      <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${form.hasPole ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <input 
                              type="checkbox" 
                              checked={form.hasPole} 
                              onChange={e => setForm({...form, hasPole: e.target.checked})}
                              className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                          />
                          <div className="ml-3">
                              <span className="block text-sm font-medium text-slate-900 flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-slate-500" /> Poste / Transformador?
                              </span>
                          </div>
                      </label>

                      <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${!form.roofVisible ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                          <input 
                              type="checkbox" 
                              checked={form.roofVisible} 
                              onChange={e => setForm({...form, roofVisible: e.target.checked})}
                              className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                          />
                          <div className="ml-3">
                              <span className="block text-sm font-medium text-slate-900 flex items-center gap-2">
                                  <Home className="w-4 h-4 text-slate-500" /> Telhado Visível?
                              </span>
                              <span className="text-xs text-slate-500">
                                  {form.roofVisible ? 'Visível da rua' : 'Obstruído / Muito alto'}
                              </span>
                          </div>
                      </label>
                  </div>

                  {/* Notes */}
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                          Observações de Acesso
                      </label>
                      <textarea
                          rows={4}
                          className="w-full rounded-xl border border-slate-300 shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Ex: Escada de 7m necessária, acesso lateral estreito, cachorro bravo..."
                          value={form.accessNotes}
                          onChange={e => setForm({...form, accessNotes: e.target.value})}
                      />
                  </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200">
                  <button 
                      onClick={handleSave}
                      className="w-full flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
                  >
                      <Save className="w-4 h-4" /> Salvar Vistoria
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default StreetViewInspector;