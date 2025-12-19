// components/CampusMap.jsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Menu, MapPin, Search, Navigation, Info as InfoIcon, Bell, Calendar, Compass, Plus, Minus, LogOut, Building2, BookOpen, Coffee, Dumbbell, FlaskRound, Trees, Shield, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Static Fallback Data (Preserved from your previous context)
const staticBuildings = [
    { id: 'STATIC_1', x: 180, y: 100, width: 70, height: 50, label: 'SCI', name: 'Science Hall (Static)', type: 'academic', color: '#7c3aed', zone: 'academic' },
    { id: 'STATIC_2', x: 180, y: 320, width: 100, height: 60, label: 'LIB', name: 'Main Library (Static)', type: 'library', color: '#2563eb', zone: 'library' },
    { id: 'STATIC_3', x: 60, y: 100, width: 60, height: 45, label: 'ADMIN', name: 'Administration (Static)', type: 'admin', color: '#7e22ce', zone: 'administration' },
    { id: 'STATIC_4', x: 340, y: 320, width: 85, height: 55, label: 'SC', name: 'Student Center (Static)', type: 'student', color: '#dc2626', zone: 'student_life' },
    { id: 'STATIC_5', x: 80, y: 370, width: 80, height: 60, label: 'GYM', name: 'Main Gymnasium (Static)', type: 'sports', color: '#059669', zone: 'sports' },
    { id: 'STATIC_6', x: 180, y: 20, width: 40, height: 25, label: 'GATE', name: 'Main Entrance (Static)', type: 'entrance', color: '#6b7280', zone: 'administration' },
];

const CampusMap = ({ onNavigate, user, onLogout }) => {
  const [activeBuilding, setActiveBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuildingDetails, setShowBuildingDetails] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  
  // === NEW STATE FOR DYNAMIC BUILDINGS ===
  const [mapBuildings, setMapBuildings] = useState(staticBuildings);

  const MIN_SCALE = 0.6;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.2;

  // Realistic campus zones with proper urban planning (SAME AS Navigate.jsx)
  const campusZones = {
    academic: { x: 150, y: 80, width: 400, height: 200, label: 'ACADEMIC CORE', color: '#1e40af' },
    administration: { x: 50, y: 80, width: 80, height: 120, label: 'ADMIN', color: '#7e22ce' },
    library: { x: 150, y: 300, width: 150, height: 120, label: 'LIBRARY QUAD', color: '#2563eb' },
    student_life: { x: 320, y: 300, width: 230, height: 120, label: 'STUDENT LIFE', color: '#dc2626' },
    sports: { x: 50, y: 350, width: 230, height: 180, label: 'SPORTS COMPLEX', color: '#059669' },
    residential: { x: 570, y: 80, width: 180, height: 300, label: 'RESIDENTIAL', color: '#ea580c' },
    arts: { x: 570, y: 400, width: 180, height: 130, label: 'ARTS QUAD', color: '#db2777' },
    parking: { x: 320, y: 430, width: 220, height: 100, label: 'PARKING', color: '#6b7280' }
  };
  
  // === FETCH DYNAMIC BUILDINGS ON MOUNT ===
  useEffect(() => {
    const fetchMapBuildings = async () => {
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('is_active', true);

        if (error || !data || data.length === 0) {
          // Fallback to static data if DB fails or is empty
          setMapBuildings(staticBuildings); 
        } else {
          // Transform DB data to Map format
          const formatted = data.map(b => ({
            id: b.id,
            x: b.coordinates?.x || 100,
            y: b.coordinates?.y || 100,
            width: b.coordinates?.width || 60,
            height: b.coordinates?.height || 40,
            label: b.building_code,
            name: b.building_name,
            type: b.building_type,
            color: b.color || '#601214',
            zone: 'academic' 
          }));
          setMapBuildings(formatted);
        }
      } catch (e) {
        console.error('Error fetching buildings:', e);
        setMapBuildings(staticBuildings); // Fallback on hard error
      }
    };
    fetchMapBuildings();
  }, []); 

  // Building Icon Utility (Preserved)
  const getBuildingIcon = (type) => {
    switch (type) {
        case 'library': return <BookOpen size={16} />;
        case 'cafeteria': return <Coffee size={16} />;
        case 'sports': return <Dumbbell size={16} />;
        case 'science': return <FlaskRound size={16} />;
        case 'admin': return <Shield size={16} />;
        default: return <Building2 size={16} />;
      }
  };

  const filteredBuildings = mapBuildings.filter(building =>
    building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    building.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pan and Zoom handlers (Preserved)
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
    setActiveBuilding(building.name);
    setSelectedBuilding(building);
    setShowBuildingDetails(true);
  };

  const handleNavigateToBuilding = () => {
    if (selectedBuilding) {
       localStorage.setItem('selectedDestination', selectedBuilding.name);
       onNavigate('navigate');
    }
  };

  // Helper Components (UPDATED TO MATCH Navigate.jsx)
  const Zone = ({ zone }) => (
    <g>
      <rect 
        x={zone.x} 
        y={zone.y} 
        width={zone.width} 
        height={zone.height} 
        fill={zone.color}
        fillOpacity="0.1"
        stroke={zone.color}
        strokeWidth="1.5"
        strokeDasharray="4 4"
        rx="12"
      />
      <text 
        x={zone.x + zone.width/2} 
        y={zone.y - 8} 
        textAnchor="middle" 
        className="font-bold pointer-events-none"
        style={{ fontSize: '10px', fill: zone.color, fontWeight: 'bold' }}
      >
        {zone.label}
      </text>
    </g>
  );

  const Building = ({ b }) => (
    <g 
      key={b.id} 
      onClick={() => handleBuildingClick(b)}
      className={`cursor-pointer transition-all duration-200 hover:drop-shadow-lg ${activeBuilding === b.name ? 'opacity-100 drop-shadow-lg' : 'opacity-90'}`}
    >
      {/* Updated to match Navigate.jsx style */}
      <rect 
        x={b.x} 
        y={b.y} 
        width={b.width} 
        height={b.height} 
        rx="8" 
        fill="white" 
        stroke={activeBuilding === b.name ? '#10b981' : '#e5e7eb'}
        strokeWidth={activeBuilding === b.name ? '3' : '2'}
        className="drop-shadow-sm"
      />
      <rect 
        x={b.x} 
        y={b.y} 
        width={b.width} 
        height={b.height * 0.3} 
        rx="8" 
        fill={activeBuilding === b.name ? '#10b981' : b.color}
        fillOpacity="0.9"
      />
      <text 
        x={b.x + b.width/2} 
        y={b.y + b.height/2 + 2} 
        textAnchor="middle" 
        className="font-bold pointer-events-none"
        style={{ fontSize: '11px', fontWeight: 'bold', fill: '#1f2937' }}
      >
        {b.label}
      </text>
    </g>
  );

  // Road and Pathway components matching Navigate.jsx
  const Road = ({ d, strokeWidth = 30, gradient = "roadGradient" }) => (
    <path d={d} fill="none" stroke={`url(#${gradient})`} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.95" />
  );

  const Pathway = ({ d, strokeWidth = 15 }) => (
    <path d={d} fill="none" stroke="url(#pathwayGradient)" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.9" />
  );

  // Static Decorations (UPDATED to match Navigate.jsx)
  const Tree = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="12" fill="#16a34a" opacity="0.7" />
      <circle cx="0" cy="-8" r="10" fill="#22c55e" opacity="0.8" />
      <circle cx="0" cy="-15" r="8" fill="#4ade80" opacity="0.9" />
      <rect x="-2" y="4" width="4" height="8" fill="#92400e" opacity="0.8" rx="1" />
    </g>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col text-gray-900">
      {/* Header (Preserved) */}
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
         <div className="flex items-center"><MapPin className="text-[#601214] mr-2"/><span className="font-black text-[#601214]">CAMPUS NAVI</span></div>
         <div className="w-8"></div> 
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Search (Preserved) */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border">
          <div className="flex gap-2">
             <div className="flex-1 bg-white border rounded-xl flex items-center px-3">
               <Search className="text-gray-400 mr-2" />
               <input type="text" placeholder="Search buildings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-12 outline-none bg-transparent" />
             </div>
             <button onClick={resetView} className="bg-[#601214] text-white w-12 h-12 rounded-xl flex items-center justify-center"><Compass /></button>
          </div>
        </div>

        {/* Map Container (UPDATED to match Navigate.jsx) */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50">
           <div className="bg-gradient-to-br from-green-50/80 to-blue-50/80 rounded-2xl w-full h-80 relative overflow-hidden border-2 border-green-200/50 cursor-grab active:cursor-grabbing shadow-inner"
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              
              <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: '0 0', transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="absolute inset-0">
                  <svg viewBox="0 0 800 600" width="800" height="600" className="drop-shadow-sm">
                     <defs>
                        {/* Grid Pattern */}
                        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d1d5db" strokeWidth="0.5" opacity="0.3"/>
                        </pattern>
                        {/* Road and Pathway Gradients */}
                        <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#78716c" />
                          <stop offset="50%" stopColor="#a8a29e" />
                          <stop offset="100%" stopColor="#78716c" />
                        </linearGradient>
                        <linearGradient id="pathwayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#e7e5e4" />
                          <stop offset="50%" stopColor="#f5f5f4" />
                          <stop offset="100%" stopColor="#e7e5e4" />
                        </linearGradient>
                     </defs>
                     <rect x="0" y="0" width="800" height="600" fill="#f0fdf4" />
                     <rect x="0" y="0" width="800" height="600" fill="url(#grid)" />
                     
                     {/* RENDER ZONES */}
                     {Object.values(campusZones).map((zone, i) => <Zone key={i} zone={zone} />)}

                     {/* MAIN ROAD SYSTEM - Matching Navigate.jsx */}
                     <g className="opacity-95">
                       {/* MAIN ENTRANCE ROAD */}
                       <path d="M200,20 L200,80" fill="none" stroke="url(#roadGradient)" strokeWidth="35" strokeLinecap="round" />
                       
                       {/* MAIN CAMPUS RING ROAD */}
                       <path d="M50,80 L750,80 L750,380 L50,380 Z" fill="none" stroke="url(#roadGradient)" strokeWidth="30" strokeLinecap="round" />
                       
                       {/* CENTRAL CROSS AXIS ROADS */}
                       <path d="M400,80 L400,380" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                       <path d="M200,230 L600,230" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                       
                       {/* RESIDENTIAL AREA ACCESS ROAD */}
                       <path d="M600,80 L600,380" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                       
                       {/* SPORTS COMPLEX ACCESS ROAD */}
                       <path d="M50,380 L200,380 L200,550" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                       
                       {/* PARKING ACCESS ROAD */}
                       <path d="M400,380 L400,550" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                       
                       {/* ARTS QUAD ACCESS ROAD */}
                       <path d="M600,380 L600,550" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                     </g>

                     {/* PATHWAY SYSTEM - Matching Navigate.jsx */}
                     <g className="opacity-90">
                       {/* CENTRAL ACADEMIC QUAD PATHWAYS */}
                       <path d="M200,80 L200,200" fill="none" stroke="url(#pathwayGradient)" strokeWidth="15" strokeLinecap="round" />
                       <path d="M400,80 L400,200" fill="none" stroke="url(#pathwayGradient)" strokeWidth="15" strokeLinecap="round" />
                       <path d="M600,80 L600,200" fill="none" stroke="url(#pathwayGradient)" strokeWidth="15" strokeLinecap="round" />
                       
                       {/* ACADEMIC BUILDING CONNECTIONS */}
                       <path d="M215,100 L400,100" fill="none" stroke="url(#pathwayGradient)" strokeWidth="12" strokeLinecap="round" />
                       <path d="M215,150 L400,150" fill="none" stroke="url(#pathwayGradient)" strokeWidth="12" strokeLinecap="round" />
                       
                       {/* LIBRARY QUAD PATHWAYS */}
                       <path d="M230,230 L230,320" fill="none" stroke="url(#pathwayGradient)" strokeWidth="12" strokeLinecap="round" />
                       <path d="M230,320 L400,320" fill="none" stroke="url(#pathwayGradient)" strokeWidth="12" strokeLinecap="round" />
                       
                       {/* STUDENT LIFE CENTER PATHWAYS */}
                       <path d="M400,230 L400,320" fill="none" stroke="url(#pathwayGradient)" strokeWidth="14" strokeLinecap="round" />
                       <path d="M400,320 L600,320" fill="none" stroke="url(#pathwayGradient)" strokeWidth="14" strokeLinecap="round" />
                       
                       {/* SPORTS COMPLEX PATHWAYS */}
                       <path d="M200,230 L200,380" fill="none" stroke="url(#pathwayGradient)" strokeWidth="12" strokeLinecap="round" />
                       
                       {/* RESIDENTIAL AREA PATHWAYS */}
                       <path d="M600,80 L600,230" fill="none" stroke="url(#pathwayGradient)" strokeWidth="14" strokeLinecap="round" />
                       
                       {/* ARTS QUAD PATHWAYS */}
                       <path d="M600,380 L600,480" fill="none" stroke="url(#pathwayGradient)" strokeWidth="14" strokeLinecap="round" />
                     </g>

                     {/* ROUNDABOUTS & INTERSECTIONS - Matching Navigate.jsx */}
                     <g>
                       {/* MAIN ENTRANCE ROUNDABOUT */}
                       <circle cx="200" cy="80" r="25" fill="#78716c" />
                       <circle cx="200" cy="80" r="15" fill="#ffffff" />
                       
                       {/* CENTRAL INTERSECTION */}
                       <circle cx="400" cy="80" r="20" fill="#78716c" />
                       <circle cx="400" cy="80" r="12" fill="#ffffff" />
                       
                       {/* LIBRARY QUAD INTERSECTION */}
                       <circle cx="230" cy="230" r="15" fill="#78716c" />
                       <circle cx="230" cy="230" r="8" fill="#ffffff" />
                       
                       {/* STUDENT LIFE INTERSECTION */}
                       <circle cx="400" cy="320" r="15" fill="#78716c" />
                       <circle cx="400" cy="320" r="8" fill="#ffffff" />
                       
                       {/* SPORTS COMPLEX INTERSECTION */}
                       <circle cx="200" cy="380" r="15" fill="#78716c" />
                       <circle cx="200" cy="380" r="8" fill="#ffffff" />
                       
                       {/* RESIDENTIAL AREA INTERSECTION */}
                       <circle cx="600" cy="230" r="15" fill="#78716c" />
                       <circle cx="600" cy="230" r="8" fill="#ffffff" />
                       
                       {/* ARTS QUAD INTERSECTION */}
                       <circle cx="600" cy="380" r="15" fill="#78716c" />
                       <circle cx="600" cy="380" r="8" fill="#ffffff" />
                     </g>

                     {/* GREEN SPACES - Matching Navigate.jsx */}
                     <g>
                       {/* CENTRAL ACADEMIC QUAD */}
                       <rect x="200" y="80" width="400" height="120" rx="20" fill="#4ade80" fillOpacity="0.4" stroke="#22c55e" strokeWidth="2" />
                       
                       {/* LIBRARY GARDEN */}
                       <rect x="180" y="280" width="150" height="80" rx="15" fill="#86efac" fillOpacity="0.3" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2" />
                       
                       {/* STUDENT LIFE PLAZA */}
                       <rect x="320" y="280" width="250" height="80" rx="15" fill="#fecaca" fillOpacity="0.2" stroke="#f87171" strokeWidth="2" strokeDasharray="4 2" />
                       
                       {/* SPORTS FIELD GREEN */}
                       <rect x="50" y="430" width="300" height="120" rx="10" fill="#86efac" fillOpacity="0.5" stroke="#16a34a" strokeWidth="2" />
                     </g>

                     {/* RENDER TREES - Updated to match Navigate.jsx style */}
                     <Tree x={140} y={50} />
                     <Tree x={280} y={290} />
                     <Tree x={600} y={40} />
                     <Tree x={350} y={400} />
                     <Tree x={650} y={420} />
                     <Tree x={100} y={450} />

                     {/* === RENDER DYNAMIC BUILDINGS === */}
                     {filteredBuildings.map(b => <Building key={b.id} b={b} />)}

                     {/* ROAD MARKINGS - Matching Navigate.jsx */}
                     <g className="opacity-90">
                       {/* Center lines */}
                       <path d="M50,80 L750,80 L750,380 L50,380 Z" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 5" />
                       <path d="M200,20 L200,80" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 5" />
                       <path d="M400,80 L400,380" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 5" />
                       
                       {/* Crosswalks */}
                       <g transform="translate(200, 80)">
                         <path d="M-20,-8 L-20,8 M-15,-8 L-15,8 M-10,-8 L-10,8 M-5,-8 L-5,8 M0,-8 L0,8 M5,-8 L5,8 M10,-8 L10,8 M15,-8 L15,8 M20,-8 L20,8" 
                           fill="none" stroke="#ffffff" strokeWidth="2" />
                       </g>
                     </g>

                     {/* CAMPUS BOUNDARY - Matching Navigate.jsx */}
                     <rect x="20" y="20" width="760" height="560" fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="5 5" />

                     {/* "YOU ARE HERE" Marker - Central Quad (Matching Navigate.jsx) */}
                     <g transform="translate(400, 140)" className="animate-pulse">
                       <circle cx="10" cy="10" r="15" fill="#ef4444" opacity="0.3" />
                       <circle cx="10" cy="10" r="10" fill="#dc2626" opacity="0.6" />
                       <circle cx="10" cy="10" r="5" fill="#b91c1c" />
                       <circle cx="10" cy="10" r="2" fill="white" />
                       <text x="30" y="15" textAnchor="start" className="font-bold" style={{ fontSize: '11px', fill: '#dc2626', fontWeight: 'bold' }}>
                         YOU ARE HERE
                       </text>
                     </g>
                  </svg>
              </div>

              {/* Map Controls - Updated to match Navigate.jsx */}
              <div className="absolute top-4 right-4 flex flex-col space-y-3 z-10">
                 <button 
                   onClick={zoomIn} 
                   disabled={scale >= MAX_SCALE}
                   className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-xl hover:scale-110 disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
                   title="Zoom In"
                 >
                   <Plus size={20} />
                 </button>
                 <button 
                   onClick={zoomOut} 
                   disabled={scale <= MIN_SCALE}
                   className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-xl hover:scale-110 disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
                   title="Zoom Out"
                 >
                   <Minus size={20} />
                 </button>
                 <div className="h-px bg-gray-300/50 mx-2"></div>
                 <button 
                   onClick={resetView}
                   className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center"
                   title="Reset View"
                 >
                   <Compass size={20} />
                 </button>
              </div>

              {/* Scale and Coordinates - Matching Navigate.jsx */}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200/50 shadow-lg">
                <div>Scale: {Math.round(scale * 100)}%</div>
                <div className="text-gray-400">X: {Math.round(panX)} Y: {Math.round(panY)}</div>
              </div>
           </div>
        </div>

        {/* Quick Buttons (FIXED: Includes Announcements, Navigation, Info, and Schedule with grid-cols-4) */}
        <div className="grid grid-cols-4 gap-4"> 
            
             {/* ANNOUNCEMENTS BUTTON */}
             <button 
                onClick={() => onNavigate('announcements')} 
                className="p-4 bg-white rounded-xl shadow flex items-center gap-3"
             >
                <Bell size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Announcements</div>
             </button>
             
             {/* NAVIGATION BUTTON */}
             <button 
                onClick={() => onNavigate('navigate')} 
                className="p-4 bg-white rounded-xl shadow flex items-center gap-3"
             >
                <Navigation size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Navigation</div>
             </button>
             
             {/* INFO BUTTON (RESTORED) */}
             <button 
                onClick={() => onNavigate('info')} 
                className="p-4 bg-white rounded-xl shadow flex items-center gap-3"
             >
                <InfoIcon size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Info</div>
             </button>
             
             {/* SCHEDULE BUTTON */}
             <button 
                onClick={() => onNavigate('schedule')} 
                className="p-4 bg-white rounded-xl shadow flex items-center gap-3"
             >
                <Calendar size={24} className="text-[#601214]"/>
                <div className="text-left font-bold">Schedule</div>
             </button>
        </div>

        {/* Building Details Modal (Preserved) */}
        {showBuildingDetails && selectedBuilding && (
           <div className="fixed bottom-6 left-6 right-6 bg-white p-5 rounded-2xl shadow-xl border animate-enter z-50">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold text-xl">{selectedBuilding.name}</h3>
                    <div className="flex gap-2 mt-1">
                        <span className="text-sm bg-[#601214] text-white px-2 py-1 rounded">{selectedBuilding.label}</span>
                        <span className="text-sm bg-gray-100 px-2 py-1 rounded capitalize">{selectedBuilding.type}</span>
                    </div>
                 </div>
                 <button onClick={() => setShowBuildingDetails(false)}><X className="text-gray-400"/></button>
              </div>
              <button onClick={handleNavigateToBuilding} className="w-full bg-[#601214] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                 <Navigation size={18}/> Get Directions
              </button>
           </div>
        )}

        {/* Quick Access/Recent Searches (Preserved) */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-gray-200/50 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {mapBuildings.slice(0, 4).map((building) => (
              <button
                key={building.id}
                onClick={() => handleBuildingClick(building)}
                className="bg-gray-50 rounded-xl p-3 text-left hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: building.color }}>
                    {getBuildingIcon(building.type)}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{building.label}</span>
                </div>
                <p className="text-gray-500 text-xs">{building.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;