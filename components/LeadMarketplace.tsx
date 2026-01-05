import React, { useState, useEffect, useRef } from 'react';
import { Lead, InspectionData } from '../types';
import { MapPin, Calendar, Zap, CheckCircle, User, Phone, Mail, Download, Map as MapIcon, LayoutGrid, Navigation, Bell, FileText, ChevronDown, CheckSquare, Square, Route, X, Timer, Car, Eye, ClipboardCheck } from 'lucide-react';
import { getStaticMapUrl, getDirectionsUrl } from '../services/googleMapsService';
import { jsPDF } from 'jspdf';
import StreetViewInspector from './StreetViewInspector';

interface LeadMarketplaceProps {
  leads: Lead[];
  onBuyLead: (id: string) => void;
  onUpdateLeadStatus: (id: string, newStatus: any) => void;
  onSaveInspection?: (id: string, data: InspectionData) => void;
  installerLocation: { lat: number, lng: number };
}

interface RouteResult {
  encodedPolyline: string;
  waypointOrder: number[];
  distanceMeters: number;
  duration: string; // e.g. "3600s"
}

const LeadMarketplace: React.FC<LeadMarketplaceProps> = ({ leads, onBuyLead, onUpdateLeadStatus, onSaveInspection, installerLocation }) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [notification, setNotification] = useState<Lead | null>(null);
  
  // Selection & Route State
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  
  // Inspection State
  const [inspectingLead, setInspectingLead] = useState<Lead | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Feature 10: Simulate Push Notification for new leads nearby
  useEffect(() => {
    const timer = setTimeout(() => {
        const mockNewLead: Lead = {
            id: 'new-99',
            homeownerName: 'Novo Cliente',
            address: 'Rua Exemplo, 500 (A 2km de você)',
            lat: installerLocation.lat + 0.01,
            lng: installerLocation.lng + 0.01,
            phoneNumber: '...',
            email: '...',
            estimatedSystemSize: 6.6,
            generatedAt: new Date().toISOString(),
            status: 'available',
            price: 50,
            distanceKm: 2.1
        };
        setNotification(mockNewLead);
        // Auto-hide after 8s
        setTimeout(() => setNotification(null), 8000);
    }, 5000); // Trigger after 5s

    return () => clearTimeout(timer);
  }, [installerLocation]);

  // Effect to initialize map when modal opens
  useEffect(() => {
      if (showRouteModal && routeResult && mapContainerRef.current && window.google) {
          initRouteMap();
      }
  }, [showRouteModal, routeResult]);

  const toggleLeadSelection = (id: string) => {
      setSelectedLeads(prev => 
        prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
      );
  };

  const handleOptimizeRoute = async () => {
      if (selectedLeads.length < 2) {
          alert("Selecione pelo menos 2 leads para criar uma rota otimizada.");
          return;
      }
      
      setIsOptimizing(true);
      
      try {
          // Filter selected objects
          const destinations = leads
             .filter(l => selectedLeads.includes(l.id))
             .map(l => ({ lat: l.lat, lng: l.lng, id: l.id }));

          const response = await fetch('http://localhost:3001/api/optimize-route', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  origin: installerLocation,
                  destinations: destinations
              })
          });

          if (!response.ok) throw new Error("Erro ao otimizar rota");
          
          const data = await response.json();
          setRouteResult(data);
          setShowRouteModal(true);
      } catch (error) {
          console.error(error);
          alert("Falha ao otimizar rota. Verifique se o servidor está rodando.");
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleInspectionSave = (data: InspectionData) => {
      if (inspectingLead && onSaveInspection) {
          onSaveInspection(inspectingLead.id, data);
          setInspectingLead(null); // Close modal
      }
  };

  const initRouteMap = () => {
      if (!mapContainerRef.current || !routeResult) return;

      const map = new window.google.maps.Map(mapContainerRef.current, {
          center: installerLocation,
          zoom: 12,
          disableDefaultUI: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          ]
      });
      mapInstanceRef.current = map;

      // Decode Polyline
      const path = window.google.maps.geometry.encoding.decodePath(routeResult.encodedPolyline);
      
      // Draw Route
      new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: "#FF8C00", // Dark Orange
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map: map
      });

      // Fit Bounds
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((p: any) => bounds.extend(p));
      map.fitBounds(bounds);

      // Add Markers
      
      // 1. Origin/Installer
      new window.google.maps.Marker({
          position: installerLocation,
          map: map,
          title: "Início (Base)",
          icon: {
             path: window.google.maps.SymbolPath.CIRCLE,
             scale: 8,
             fillColor: "#3b82f6",
             fillOpacity: 1,
             strokeWeight: 2,
             strokeColor: "white",
          }
      });

      // 2. Stops (Leads)
      const selectedLeadObjects = leads.filter(l => selectedLeads.includes(l.id));
      
      // routeResult.waypointOrder contains the indices of destinations in order
      // We iterate the order array to place numbered markers
      routeResult.waypointOrder.forEach((originalIndex, sequenceOrder) => {
          const lead = selectedLeadObjects[originalIndex];
          if (!lead) return;

          const markerLabel = (sequenceOrder + 1).toString();
          
          new window.google.maps.Marker({
              position: { lat: lead.lat, lng: lead.lng },
              map: map,
              label: { text: markerLabel, color: "white", fontWeight: "bold" },
              title: lead.homeownerName,
          });
      });
  };

  const exportCSV = () => {
    const headers = ["ID", "Nome", "Endereço", "Sistema (kW)", "Preço", "Status", "Pipeline", "Vistoria", "Data"];
    const rows = leads.map(l => [
        l.id, 
        l.homeownerName, 
        `"${l.address}"`, 
        l.estimatedSystemSize, 
        l.price, 
        l.status, 
        l.pipelineStatus || 'N/A', 
        l.inspection ? 'Sim' : 'Não',
        l.generatedAt
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "meus_leads_solar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateProposalPDF = (lead: Lead) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // -- Header --
      doc.setFillColor(249, 115, 22); // Orange 500
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text("SolarSavian", 20, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text("Proposta Comercial de Energia Solar", 20, 30);

      // -- Client Info --
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Dados do Cliente", 20, 60);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 63, pageWidth - 20, 63);

      doc.text(`Nome: ${lead.homeownerName}`, 20, 75);
      doc.text(`Endereço: ${lead.address}`, 20, 85);
      doc.text(`Data da Proposta: ${new Date().toLocaleDateString('pt-BR')}`, 20, 95);

      // -- Technical Info --
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Especificações Técnicas", 20, 115);
      doc.line(20, 118, pageWidth - 20, 118);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      // Estimated math based on kWp
      const annualSavings = (lead.estimatedSystemSize * 115 * 0.92 * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const monthlyProd = (lead.estimatedSystemSize * 115).toFixed(0);

      doc.text(`Potência do Sistema: ${lead.estimatedSystemSize} kWp`, 20, 130);
      doc.text(`Produção Média Estimada: ${monthlyProd} kWh/mês`, 20, 140);
      doc.text(`Economia Anual Estimada: ${annualSavings}`, 20, 150);

      if (lead.inspection) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text("Notas de Vistoria (Virtual)", 20, 170);
          doc.line(20, 173, pageWidth - 20, 173);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Árvores: ${lead.inspection.hasTree ? 'Sim' : 'Não'} | Poste/Trafo: ${lead.inspection.hasPole ? 'Sim' : 'Não'}`, 20, 180);
          doc.text(`Obs: ${lead.inspection.accessNotes}`, 20, 188);
      }

      // -- Footer --
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Documento gerado automaticamente via SolarSavian Marketplace.", 20, 280);

      doc.save(`Proposta_${lead.homeownerName.replace(/\s/g, '_')}.pdf`);
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Novo': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'Contatado': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'Visita': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'Fechado': return 'bg-green-100 text-green-700 border-green-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const soldCount = leads.filter(l => l.status === 'sold').length;
  const investment = leads.filter(l => l.status === 'sold').reduce((acc, curr) => acc + curr.price, 0);

  // Helper to get ordered leads for display
  const getOrderedLeads = () => {
      if (!routeResult) return [];
      const selectedLeadObjects = leads.filter(l => selectedLeads.includes(l.id));
      return routeResult.waypointOrder.map(idx => selectedLeadObjects[idx]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-fade-in relative">
      
      {/* Feature 10: Push Notification Toast */}
      {notification && (
          <div className="fixed top-24 right-4 md:right-8 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl animate-scale-in border-l-4 border-yellow-500 max-w-sm">
              <div className="flex items-start gap-3">
                  <div className="bg-yellow-500/20 p-2 rounded-full">
                      <Bell className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                      <h4 className="font-bold text-sm">Novo Lead na sua Área!</h4>
                      <p className="text-xs text-slate-300 mt-1">{notification.address}</p>
                      <p className="text-xs font-bold text-yellow-400 mt-1">Potencial: {notification.estimatedSystemSize} kWp</p>
                      <button 
                        onClick={() => { onBuyLead(notification.id); setNotification(null); }}
                        className="mt-2 bg-white text-slate-900 text-xs font-bold py-1 px-3 rounded-lg hover:bg-slate-200"
                      >
                          Ver Detalhes
                      </button>
                  </div>
                  <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-white">&times;</button>
              </div>
          </div>
      )}

      {/* Floating Route Optimizer Button */}
      {selectedLeads.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
              <button 
                onClick={handleOptimizeRoute}
                disabled={isOptimizing}
                className="bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl shadow-slate-900/40 flex items-center gap-3 font-bold hover:scale-105 transition-transform"
              >
                  {isOptimizing ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  ) : (
                      <Route className="w-5 h-5 text-orange-500" />
                  )}
                  {isOptimizing ? 'Calculando Rota...' : `Otimizar Rota (${selectedLeads.length})`}
              </button>
          </div>
      )}

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Saldo Disponível</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">R$ 450,00</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Leads Adquiridos</p>
            <div className="flex items-end gap-2 mt-1">
                <p className="text-3xl font-bold text-slate-900">{soldCount}</p>
                <span className="text-green-600 text-sm font-medium mb-1">+{soldCount} esta semana</span>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Investimento Total</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">R$ {investment},00</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mercado de Leads</h2>
          <p className="text-slate-500">Selecione múltiplos leads para criar uma rota de visitas.</p>
        </div>
        
        <div className="flex gap-2">
            <div className="bg-slate-100 p-1 rounded-lg flex">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode('map')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <MapIcon className="w-5 h-5" />
                </button>
            </div>
            <button 
                onClick={exportCSV}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
                <Download className="w-4 h-4" />
                Exportar CSV
            </button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Nenhum lead ativo</h3>
          <p className="text-slate-500">Aguardando novos proprietários.</p>
        </div>
      ) : (
        <>
            {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leads.map((lead) => (
                    <div key={lead.id} className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col group relative ${selectedLeads.includes(lead.id) ? 'border-orange-500 ring-2 ring-orange-100 shadow-xl' : 'border-slate-200 hover:shadow-lg'}`}>
                    
                    {/* Selection Checkbox (Absolute Top Left) */}
                    <button 
                        onClick={() => toggleLeadSelection(lead.id)}
                        className="absolute top-3 left-3 z-20 text-white drop-shadow-md hover:scale-110 transition-transform"
                    >
                        {selectedLeads.includes(lead.id) ? (
                            <CheckSquare className="w-6 h-6 text-orange-500 bg-white rounded-md" />
                        ) : (
                            <Square className="w-6 h-6 text-white/80" />
                        )}
                    </button>

                    {/* Map Header */}
                    <div className="h-40 bg-slate-100 overflow-hidden relative rounded-t-2xl">
                         <img 
                            src={getStaticMapUrl(lead.lat, lead.lng, 19, '400x200')} 
                            className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
                         />
                         <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${lead.status === 'sold' ? 'bg-white text-slate-500' : 'bg-green-500 text-white'}`}>
                                {lead.status === 'sold' ? 'Vendido' : 'Novo'}
                            </div>
                         </div>
                         {/* Feature 6: Distance/Route Indicator */}
                         {lead.distanceKm && (
                             <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                 <Navigation className="w-3 h-3" />
                                 {lead.distanceKm.toFixed(1)} km de você
                             </div>
                         )}
                    </div>

                    <div className="p-6 flex-grow">
                        <div className="space-y-3">
                            <div className="flex justify-between items-start">
                                <span className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(lead.generatedAt).toLocaleDateString('pt-BR')}
                                </span>
                                
                                {/* CRM STATUS BADGE (Only for Sold) */}
                                {lead.status === 'sold' && lead.pipelineStatus && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(lead.pipelineStatus)}`}>
                                        {lead.pipelineStatus}
                                    </span>
                                )}
                            </div>
                            
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                            <p className="text-slate-800 font-medium line-clamp-2">{lead.address}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <p className="text-slate-600">Potencial: <span className="font-semibold text-slate-900">{lead.estimatedSystemSize} kWp</span></p>
                        </div>

                        {lead.status === 'sold' ? (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50 p-3 rounded-lg">
                                
                                {/* Contact Info */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium">{lead.homeownerName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span>{lead.phoneNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm truncate">{lead.email}</span>
                                    </div>
                                </div>

                                {/* Virtual Inspection Status / Action */}
                                <div className="pt-2 border-t border-slate-200/50">
                                    {lead.inspection ? (
                                        <div onClick={() => setInspectingLead(lead)} className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                                            <ClipboardCheck className="w-4 h-4" />
                                            <span className="text-xs font-bold">Vistoria Realizada</span>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setInspectingLead(lead)}
                                            className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <Eye className="w-3 h-3" /> Fazer Vistoria Virtual
                                        </button>
                                    )}
                                </div>

                                {/* Mini-CRM Actions */}
                                <div className="pt-3 border-t border-slate-200">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Gestão do Lead</p>
                                    
                                    {/* Pipeline Selector */}
                                    <div className="relative mb-3">
                                        <select 
                                            value={lead.pipelineStatus || 'Novo'} 
                                            onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value)}
                                            className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2 px-3 pr-8 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Novo">🔵 Novo</option>
                                            <option value="Contatado">🟡 Contatado</option>
                                            <option value="Visita">🟣 Visita Agendada</option>
                                            <option value="Fechado">🟢 Fechado</option>
                                        </select>
                                        <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                                    </div>

                                    {/* PDF Generator Button */}
                                    <button 
                                        onClick={() => generateProposalPDF(lead)}
                                        className="w-full flex items-center justify-center gap-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 py-2 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        <FileText className="w-3 h-3" />
                                        Baixar Proposta Formal
                                    </button>
                                </div>

                                {/* Google Maps Route Link */}
                                <a 
                                    href={getDirectionsUrl(installerLocation.lat, installerLocation.lng, lead.lat, lead.lng)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 w-full mt-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                                >
                                    <Navigation className="w-3 h-3" />
                                    Abrir Rota GPS
                                </a>
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-slate-100 filter blur-[2px] select-none opacity-50 p-2">
                                <p>João Silva</p>
                                <p>(11) 99999-9999</p>
                                <p>joao@exemplo.com.br</p>
                            </div>
                        )}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                        {lead.status === 'available' ? (
                        <button 
                            onClick={() => onBuyLead(lead.id)}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                        >
                            <span>Desbloquear (R$ {lead.price})</span>
                        </button>
                        ) : (
                        <button disabled className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3 px-4 rounded-xl cursor-default">
                            <CheckCircle className="w-5 h-5" />
                            <span>Adquirido</span>
                        </button>
                        )}
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="bg-slate-100 rounded-3xl p-4 min-h-[600px] flex items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden group">
                     {/* Static Map Background Simulation */}
                     <img 
                        src={getStaticMapUrl(installerLocation.lat, installerLocation.lng, 13, '800x600')} 
                        className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale"
                     />
                    <div className="z-10 bg-white/90 p-6 rounded-2xl backdrop-blur-md text-slate-600 font-medium text-center shadow-xl">
                        <MapIcon className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                        <h3 className="text-lg font-bold text-slate-800">Mapa de Oportunidades</h3>
                        <p className="text-sm font-normal">Mostrando leads em um raio de 20km.</p>
                    </div>
                    {/* Simulated Markers with Improved Distribution */}
                    {leads.map((lead, i) => (
                        <div key={lead.id} className="absolute p-2 bg-white rounded-lg shadow-xl flex flex-col items-center gap-1 transform hover:scale-125 transition-transform cursor-pointer border-2 border-slate-900 z-20 group"
                             style={{ 
                                 top: `${20 + ((i * 33) % 60)}%`, 
                                 left: `${15 + ((i * 45) % 70)}%` 
                             }}>
                            <div className={`w-3 h-3 rounded-full ${lead.status === 'sold' ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`}></div>
                            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">R$ {lead.price}</span>
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs p-2 rounded whitespace-nowrap z-30">
                                {lead.estimatedSystemSize} kWp
                            </div>
                        </div>
                    ))}
                    {/* Installer Marker */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-full shadow-2xl border-4 border-white z-30">
                         <Navigation className="w-6 h-6 text-white" />
                     </div>
                </div>
            )}
        </>
      )}

      {/* Street View Inspection Modal */}
      {inspectingLead && (
          <div className="fixed inset-0 bg-black/90 z-[110] p-4 flex items-center justify-center animate-scale-in">
              <div className="w-full max-w-6xl h-[85vh] relative">
                   <StreetViewInspector 
                       lat={inspectingLead.lat}
                       lng={inspectingLead.lng}
                       initialData={inspectingLead.inspection}
                       onSave={handleInspectionSave}
                       onClose={() => setInspectingLead(null)}
                   />
              </div>
          </div>
      )}

      {/* Route Optimization Modal */}
      {showRouteModal && routeResult && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-5xl h-[80vh] flex overflow-hidden shadow-2xl animate-scale-in relative">
                  <button 
                    onClick={() => setShowRouteModal(false)}
                    className="absolute top-4 right-4 z-50 bg-white p-2 rounded-full shadow-lg hover:bg-slate-100"
                  >
                      <X className="w-5 h-5 text-slate-600" />
                  </button>

                  {/* Sidebar List */}
                  <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
                      <div className="p-6 bg-white border-b border-slate-100">
                          <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
                              <Route className="w-5 h-5 text-orange-500" />
                              Rota Otimizada
                          </h3>
                          <div className="flex gap-4 text-xs text-slate-500 mt-2">
                              <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                  <Car className="w-3 h-3" /> {(routeResult.distanceMeters / 1000).toFixed(1)} km
                              </span>
                              <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                  <Timer className="w-3 h-3" /> {(parseInt(routeResult.duration) / 60).toFixed(0)} min
                              </span>
                          </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          <div className="flex gap-3 items-center opacity-50">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  Inicio
                              </div>
                              <p className="text-sm font-medium">Sua Base</p>
                          </div>
                          
                          {/* Render Ordered Stops */}
                          {getOrderedLeads().map((lead, index) => (
                              <div key={lead.id} className="flex gap-3 items-start p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                      {index + 1}
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 text-sm">{lead.homeownerName}</p>
                                      <p className="text-xs text-slate-500 line-clamp-1">{lead.address}</p>
                                      <div className="flex gap-2 mt-2">
                                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                              {lead.estimatedSystemSize} kWp
                                          </span>
                                          {lead.inspection && (
                                              <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded text-green-700 border border-green-200 flex items-center gap-1">
                                                  <ClipboardCheck className="w-3 h-3" /> Vistoriado
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}

                          <div className="flex gap-3 items-center opacity-50">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  Fim
                              </div>
                              <p className="text-sm font-medium">Retorno à Base</p>
                          </div>
                      </div>
                      
                      <div className="p-4 border-t border-slate-200 bg-white">
                          <button 
                            onClick={() => window.alert('Navegação enviada para o App Mobile (Simulado)')}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                              <Navigation className="w-4 h-4" /> Iniciar Navegação
                          </button>
                      </div>
                  </div>

                  {/* Map Area */}
                  <div className="w-2/3 bg-slate-200 relative">
                      <div ref={mapContainerRef} className="w-full h-full" />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LeadMarketplace;