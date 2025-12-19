// components/CampusMap.jsx - UPDATED TO MATCH CAMPUS PLAN IMAGE

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Menu, MapPin, Search, Navigation, Info as InfoIcon, Bell, Calendar, Compass, Plus, Minus, LogOut, Building2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CampusMap = ({ onNavigate, user, onLogout }) => {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuildingDetails, setShowBuildingDetails] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  
  const [mapBuildings, setMapBuildings] = useState([]);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.2;

  // Building definitions matching the campus plan image
  const campusPlanBuildings = [
    // Top Left - Dark Green triangular area
    { id: 'green-area', points: '20,80 20,280 180,180', color: '#1B5E20', label: '', name: 'Green Area', type: 'polygon' },
    
    // Top Left Buildings
    { id: 'yellow-small', x: 200, y: 180, width: 50, height: 40, color: '#FDD835', label: '', name: 'Small Office', rotation: -25 },
    
    // Large Beige - Covered Court
    { id: 'covered-court', x: 160, y: 210, width: 180, height: 140, color: '#D7CCC8', label: 'Covered Court', name: 'Covered Court', rotation: -25 },
    
    // Purple Buildings - Top
    { id: 'purple-main', x: 280, y: 40, width: 200, height: 160, color: '#6A1B9A', label: 'Classroom', name: 'Main Classroom Building', rotation: -10 },
    { id: 'purple-small', x: 330, y: 20, width: 80, height: 80, color: '#7B1FA2', label: '', name: 'Office Block', rotation: -10 },
    { id: 'gray-top', x: 420, y: 20, width: 100, height: 80, color: '#616161', label: '', name: 'Storage', rotation: -10 },
    
    // Top Right - Cafeteria
    { id: 'cafeteria', x: 500, y: 60, width: 140, height: 80, color: '#FFA726', label: 'Cafeteria', name: 'Cafeteria', rotation: -10 },
    
    // Right Blue - Swimming Pool
    { id: 'swimming-pool', x: 640, y: 100, width: 200, height: 100, color: '#1976D2', label: 'Swimming pool', name: 'Swimming Pool', rotation: -10 },
    { id: 'pool-area', x: 840, y: 120, width: 80, height: 60, color: '#9575CD', label: '', name: 'Pool Area', rotation: -10 },
    
    // Center - VACANT LOT (Large Blue)
    { id: 'vacant-lot', x: 380, y: 220, width: 300, height: 200, color: '#0277BD', label: 'VACANT LOT', name: 'Open Space', rotation: -10 },
    
    // Orange squares on vacant lot
    { id: 'orange-1', x: 450, y: 210, width: 40, height: 35, color: '#FF6F00', label: '', name: 'Structure 1', rotation: -10 },
    { id: 'orange-2', x: 560, y: 200, width: 40, height: 35, color: '#FF6F00', label: '', name: 'Structure 2', rotation: -10 },
    { id: 'orange-3', x: 420, y: 280, width: 40, height: 35, color: '#FF6F00', label: '', name: 'Structure 3', rotation: -10 },
    
    // Green circles (trees)
    { id: 'tree-1', x: 490, y: 210, r: 12, color: '#4CAF50', name: 'Tree', type: 'circle' },
    { id: 'tree-2', x: 530, y: 280, r: 12, color: '#4CAF50', name: 'Tree', type: 'circle' },
    { id: 'tree-3', x: 600, y: 200, r: 12, color: '#4CAF50', name: 'Tree', type: 'circle' },
    { id: 'tree-left-1', x: 75, y: 300, r: 12, color: '#4CAF50', name: 'Tree', type: 'circle' },
    { id: 'tree-left-2', x: 100, y: 300, r: 12, color: '#4CAF50', name: 'Tree', type: 'circle' },
    
    // Right Side - Green Lime and Pink
    { id: 'lime-green', x: 720, y: 380, width: 80, height: 90, color: '#CDDC39', label: '', name: 'Faculty Room', rotation: -10 },
    { id: 'pink-right', x: 810, y: 400, width: 110, height: 80, color: '#F48FB1', label: 'Arts & Crafts', name: 'Arts Building', rotation: -10 },
    
    // Left Side Bottom - Light Blue (Cottage/Lodge)
    { id: 'cottage', x: 100, y: 380, width: 100, height: 90, color: '#4FC3F7', label: 'Cottage/Lodge', name: 'Cottage', rotation: -25 },
    
    // Center Bottom Area
    { id: 'technology', x: 180, y: 420, width: 90, height: 140, color: '#EF5350', label: 'Technology', name: 'Technology Building', rotation: -25 },
    { id: 'green-center', x: 270, y: 450, width: 70, height: 100, color: '#66BB6A', label: '', name: 'Green Building', rotation: -25 },
    { id: 'brown-small', x: 180, y: 570, width: 60, height: 50, color: '#8D6E63', label: '', name: 'Storage', rotation: -25 },
    { id: 'green-small', x: 240, y: 580, width: 70, height: 50, color: '#81C784', label: '', name: 'Workshop', rotation: -25 },
    { id: 'canteen', x: 340, y: 450, width: 90, height: 150, color: '#FF9800', label: '', name: 'Canteen', rotation: -25 },
    { id: 'yellow-center', x: 460, y: 420, width: 60, height: 60, color: '#FFEB3B', label: '', name: 'Office', rotation: -25 },
    { id: 'green-dot', x: 480, y: 500, r: 10, color: '#4CAF50', name: 'Tree', type: 'circle' },
    
    // Large Gray Center - LONG BUILDING
    { id: 'long-building', x: 400, y: 480, width: 280, height: 160, color: '#757575', label: 'LONG BUILDING', name: 'Engineering Building', rotation: -10 },
    
    // Light Blue Right (Engineering Building)
    { id: 'engineering-blue', x: 680, y: 550, width: 100, height: 130, color: '#64B5F6', label: 'Engineering Building', name: 'Engineering Lab', rotation: -10 },
    
    // Bottom Entrance Area
    { id: 'parking-1', x: 220, y: 760, width: 120, height: 60, color: '#4FC3F7', label: 'PARKING AREA', name: 'Parking Area 1', rotation: -10 },
    { id: 'parking-2', x: 350, y: 780, width: 120, height: 60, color: '#4FC3F7', label: 'PARKING AREA', name: 'Parking Area 2', rotation: -10 },
    
    // Green circles at parking
    { id: 'tree-parking-1', x: 260, y: 740, r: 10, color: '#4CAF50', name: 'Tree', type: 'circle' },
    { id: 'tree-parking-2', x: 320, y: 740, r: 10, color: '#4CAF50', name: 'Tree', type: 'circle' },
    { id: 'tree-parking-3', x: 380, y: 740, r: 10, color: '#4CAF50', name: 'Tree', type: 'circle' },
    
    // Red square at parking
    { id: 'red-parking', x: 380, y: 820, width: 40, height: 35, color: '#F44336', label: '', name: 'Gate Control', rotation: -10 },
  ];
  
  useEffect(() => {
    fetchDatabaseBuildings();
  }, []);

  const fetchDatabaseBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('is_active', true);

      if (error || !data || data.length === 0) {
        setMapBuildings(campusPlanBuildings);
      } else {
        // Merge database buildings with campus plan
        const formatted = data.map(b => ({
          id: b.id,
          x: b.coordinates?.x || 100,
          y: b.coordinates?.y || 100,
          width: b.coordinates?.width || 60,
          height: b.coordinates?.height || 40,
          label: b.building_code,
          name: b.building_name,
          color: b.color || '#601214',
          rotation: b.coordinates?.rotation || 0
        }));
        setMapBuildings([...campusPlanBuildings, ...formatted]);
      }
    } catch (e) {
      console.error('Error fetching buildings:', e);
      setMapBuildings(campusPlanBuildings);
    }
  };

  const filteredBuildings = mapBuildings.filter(building =>
    building.name && building.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    startPanRef.current = { x: e.clientX - panX, y: e.clientY - panY };
  }, [panX, panY]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPanX(e.clientX - startPanRef.current.x);
    setPanY(e.clientY - startPanRef.current.y);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_SCALE));
  const resetView = () => { setScale(1.0); setPanX(0); setPanY(0); };

  const handleBuildingClick = (building) => {
    if (building.type === 'polygon' || building.type === 'circle') return;
    setSelectedBuilding(building);
    setShowBuildingDetails(true);
  };

  const handleNavigateToBuilding = () => {
    if (selectedBuilding) {
       localStorage.setItem('selectedDestination', selectedBuilding.name);
       onNavigate('navigate');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col text-gray-900">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-4 flex items-center justify-between border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
         <div className="relative">
             <button onClick={() => setShowMenu(!showMenu)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full"><Menu size={24} /></button>
             {showMenu && (
                <div className="absolute top-12 left-0 bg-white p-2 rounded-xl shadow-xl border min-w-48 z-50">
                   <div className="px-4 py-2 border-b"><p className="font-bold">{user?.username || 'Guest'}</p></div>
                   <button onClick={onLogout} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex gap-2"><LogOut size={16}/> Log Out</button>
                </div>
             )}
         </div>
         <div className="flex items-center"><MapPin className="text-[#601214] mr-2"/><span className="font-black text-[#601214]">CAMPUS MAP</span></div>
         <div className="w-8"></div> 
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Search */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border">
          <div className="flex gap-2">
             <div className="flex-1 bg-white border rounded-xl flex items-center px-3">
               <Search className="text-gray-400 mr-2" />
               <input type="text" placeholder="Search buildings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-12 outline-none bg-transparent" />
             </div>
             <button onClick={resetView} className="bg-[#601214] text-white w-12 h-12 rounded-xl flex items-center justify-center"><Compass /></button>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50">
           <div className="bg-[#D7CCC8] rounded-2xl w-full h-[600px] relative overflow-hidden border-2 border-gray-300 cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              
              <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: '0 0', transition: isDragging ? 'none' : 'transform 0.3s ease' }} className="absolute inset-0">
                  <svg viewBox="0 0 950 900" width="950" height="900">
                     <rect x="0" y="0" width="950" height="900" fill="#D7CCC8" />
                     
                     {/* Gray Pathways */}
                     <path d="M 150 300 L 850 200" stroke="#9E9E9E" strokeWidth="80" opacity="0.7" />
                     <path d="M 200 600 L 750 500" stroke="#9E9E9E" strokeWidth="80" opacity="0.7" />
                     <path d="M 400 100 L 350 850" stroke="#9E9E9E" strokeWidth="60" opacity="0.7" />
                     
                     {/* Buildings */}
                     {filteredBuildings.map((building) => {
                       if (building.type === 'polygon') {
                         return (
                           <polygon
                             key={building.id}
                             points={building.points}
                             fill={building.color}
                             stroke="#fff"
                             strokeWidth="3"
                             opacity="0.9"
                             className="cursor-pointer hover:opacity-100"
                           />
                         );
                       } else if (building.type === 'circle') {
                         return (
                           <circle
                             key={building.id}
                             cx={building.x}
                             cy={building.y}
                             r={building.r}
                             fill={building.color}
                             opacity="0.8"
                           />
                         );
                       } else {
                         return (
                           <g 
                             key={building.id} 
                             onClick={() => handleBuildingClick(building)}
                             className="cursor-pointer hover:opacity-100"
                             transform={`rotate(${building.rotation || 0} ${building.x + building.width/2} ${building.y + building.height/2})`}
                           >
                             <rect 
                               x={building.x} 
                               y={building.y} 
                               width={building.width} 
                               height={building.height} 
                               fill={building.color}
                               stroke="#fff"
                               strokeWidth="2"
                               rx="4"
                               opacity="0.9"
                             />
                             {building.label && (
                               <text 
                                 x={building.x + building.width/2} 
                                 y={building.y + building.height/2 + 4} 
                                 textAnchor="middle" 
                                 style={{ 
                                   fontSize: '11px', 
                                   fill: building.label.includes('LOT') || building.label.includes('BUILDING') ? '#E91E63' : '#fff', 
                                   fontWeight: 'bold',
                                   pointerEvents: 'none'
                                 }}
                               >
                                 {building.label}
                               </text>
                             )}
                           </g>
                         );
                       }
                     })}
                     
                     {/* Entrance Gate with Guard House */}
                     <g transform="translate(340, 850)">
                       <rect x="-40" y="-35" width="80" height="70" fill="white" stroke="#424242" strokeWidth="3" rx="4" />
                       <circle cx="0" cy="-15" r="12" fill="none" stroke="#D32F2F" strokeWidth="3" />
                       <line x1="0" y1="-25" x2="0" y2="-5" stroke="#D32F2F" strokeWidth="3" />
                       <line x1="-10" y1="-15" x2="10" y2="-15" stroke="#D32F2F" strokeWidth="3" />
                       <text x="0" y="20" textAnchor="middle" style={{ fontSize: '9px', fill: '#424242', fontWeight: 'bold' }}>GUARD</text>
                       <text x="0" y="50" textAnchor="middle" style={{ fontSize: '12px', fill: '#D32F2F', fontWeight: 'bold' }}>ENTRANCE GATE</text>
                     </g>
                     
                     {/* Campus Info */}
                     <g transform="translate(800, 820)">
                       <text x="0" y="0" textAnchor="start" style={{ fontSize: '28px', fill: '#424242', fontWeight: 'normal', fontFamily: 'serif' }}>CAMPUS PLAN</text>
                       <line x1="0" y1="5" x2="200" y2="5" stroke="#9E9E9E" strokeWidth="3" />
                       <text x="0" y="30" textAnchor="start" style={{ fontSize: '16px', fill: '#757575' }}>1. 115446 hectares</text>
                     </g>
                  </svg>
              </div>

              {/* Map Controls */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
                 <button onClick={zoomIn} disabled={scale >= MAX_SCALE} className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"><Plus size={20} /></button>
                 <button onClick={zoomOut} disabled={scale <= MIN_SCALE} className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"><Minus size={20} /></button>
                 <button onClick={resetView} className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50"><Compass size={20} /></button>
              </div>

              <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 shadow-lg">
                Zoom: {Math.round(scale * 100)}%
              </div>
           </div>
        </div>

        {/* Quick Buttons */}
        <div className="grid grid-cols-4 gap-4"> 
             <button onClick={() => onNavigate('announcements')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3">
                <Bell size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Announcements</div>
             </button>
             <button onClick={() => onNavigate('navigate')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3">
                <Navigation size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Navigation</div>
             </button>
             <button onClick={() => onNavigate('info')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3">
                <InfoIcon size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Info</div>
             </button>
             <button onClick={() => onNavigate('schedule')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3">
                <Calendar size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Schedule</div>
             </button>
        </div>

        {/* Building Details Modal */}
        {showBuildingDetails && selectedBuilding && (
           <div className="fixed bottom-6 left-6 right-6 bg-white p-5 rounded-2xl shadow-xl border animate-enter z-50 max-w-md mx-auto">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold text-xl">{selectedBuilding.name}</h3>
                    <div className="flex gap-2 mt-1">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: selectedBuilding.color }}></div>
                        <span className="text-sm text-gray-500">{selectedBuilding.label || 'Campus Building'}</span>
                    </div>
                 </div>
                 <button onClick={() => setShowBuildingDetails(false)}><X className="text-gray-400"/></button>
              </div>
              <button onClick={handleNavigateToBuilding} className="w-full bg-[#601214] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                 <Navigation size={18}/> Get Directions
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default CampusMap;