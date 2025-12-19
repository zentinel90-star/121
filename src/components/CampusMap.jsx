import React, { useState } from 'react';
import { MapPin, Search, Navigation, X } from 'lucide-react';

const AccurateCampusMap = () => {
  const [selected, setSelected] = useState(null);

  // These coordinates are manually tuned to match the "skewed" perspective of your photo
  const buildings = [
    { id: 'eng-top', name: "Engineering (Top)", color: "#483285", points: "285,65 480,110 445,260 380,240 405,175 305,145", label: "Engineering" },
    { id: 'canteen', name: "Canteen", color: "#F9D478", points: "485,95 625,145 585,225 450,175", label: "canteen" },
    { id: 'highschool', name: "High School", color: "#4AA9E9", points: "595,175 890,355 860,435 560,245", label: "HIGHSCHOOL" },
    { id: 'vacant', name: "Vacant Lot", color: "#1A5A96", points: "405,195 745,330 660,475 355,295", label: "VACANT LOT" },
    { id: 'court', name: "Covered Court", color: "#F2E8C4", points: "175,165 390,275 350,375 145,265", label: "Covered court" },
    { id: 'crim', name: "Criminology", color: "#7DC7E7", points: "105,395 270,445 230,545 75,495", label: "Criminology" },
    { id: 'tech', name: "Technology", color: "#F06464", points: "185,555 395,355 445,385 270,655", label: "technology" },
    { id: 'ground', name: "Open Ground", color: "#8A8A8A", points: "395,365 695,495 535,795 345,715", label: "OPEN GROUND" },
    { id: 'parking1', name: "Parking Area A", color: "#88D5F0", points: "205,775 315,835 255,935 145,875", label: "PARKING AREA" },
    { id: 'parking2', name: "Parking Area B", color: "#88D5F0", points: "265,805 355,855 305,955 215,905", label: "PARKING AREA" },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] font-sans overflow-hidden">
      {/* Search Header */}
      <div className="p-4 flex items-center gap-4 bg-white/80 backdrop-blur-md border-b">
        <div className="text-red-900 font-black text-xl flex items-center gap-1">
          <MapPin size={24} fill="currentColor" /> CAMPUS MAP
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input className="w-full bg-gray-100 border-none rounded-lg py-2 pl-10 pr-4" placeholder="Search buildings..." />
        </div>
      </div>

      <div className="relative flex-1 bg-[#E8EDF2] flex items-center justify-center p-4">
        {/* The Map SVG */}
        <svg viewBox="0 0 1000 1000" className="w-full h-full max-w-[800px] drop-shadow-2xl">
          {/* Background Skewed Gray Ground */}
          <polygon points="20,380 450,50 980,450 880,980 150,920" fill="#BCC6CC" />

          {buildings.map((b) => (
            <g key={b.id} onClick={() => setSelected(b)} className="cursor-pointer group">
              {/* Fake 3D Shadow/Side Effect */}
              <polygon points={b.points} fill="black" opacity="0.1" transform="translate(4, 4)" />
              
              {/* Main Building Shape */}
              <polygon 
                points={b.points} 
                fill={b.color} 
                className="transition-all group-hover:brightness-110"
                stroke={selected?.id === b.id ? "white" : "none"}
                strokeWidth="3"
              />
              
              {/* Red Labels - Rotated to match perspective */}
              {b.label && (
                <text 
                  x={b.points.split(',')[0]} 
                  y={b.points.split(',')[1]} 
                  dy="50" dx="30"
                  transform="rotate(15)"
                  className="fill-red-600 font-bold text-[11px] pointer-events-none opacity-80"
                >
                  {b.label}
                </text>
              )}
            </g>
          ))}

          {/* Special Decorations */}
          <circle cx="70" cy="370" r="8" fill="#4CAF50" />
          <circle cx="100" cy="375" r="8" fill="#4CAF50" />
          
          {/* Entrance/Exit text */}
          <text x="230" y="985" className="fill-red-700 font-bold text-xs italic">ENTRANCE GATE</text>
          <text x="920" y="480" transform="rotate(75 920,480)" className="fill-red-700 font-bold text-xs italic">EXIT GATE</text>
        </svg>

        {/* Info Box */}
        {selected && (
          <div className="absolute bottom-8 right-8 bg-white p-6 rounded-2xl shadow-2xl border-l-4 border-red-700 w-72 animate-in fade-in slide-in-from-right-4">
            <button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-gray-400"><X size={18}/></button>
            <h3 className="font-black text-gray-800 text-lg uppercase leading-tight">{selected.name}</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">Located in the main campus area.</p>
            <button className="w-full bg-red-800 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-900 transition-colors">
              <Navigation size={16} /> GO
            </button>
          </div>
        )}
      </div>
      
      {/* Footer Label */}
      <div className="p-6 bg-white flex justify-end border-t">
        <div className="text-right">
          <h2 className="text-4xl font-serif text-gray-700 tracking-tighter uppercase">Campus Plan</h2>
          <div className="h-[2px] bg-gray-300 w-full mt-1 mb-1"></div>
          <p className="text-gray-500 italic">1. 115446 hectares</p>
        </div>
      </div>
    </div>
  );
};

export default AccurateCampusMap;