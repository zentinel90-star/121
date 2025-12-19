import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MapPin, Navigation2, Clock, Footprints, Compass, User, Building2, Play, Pause, RotateCcw, Move, CornerUpRight, Search, Plus, Minus } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Navigate = ({ onNavigate }) => {
  const [route, setRoute] = useState({
    start: '',
    destination: ''
  });
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [stepByStep, setStepByStep] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [availableStartPoints, setAvailableStartPoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New state for tracking animation
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);

  const animationRef = useRef(null);
  const mapRef = useRef(null);
  const startPanRef = useRef({ x: 0, y: 0 });

  // --- Navigation Constants ---
  const SIMULATED_SPEED = 0.05;
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.2;

  // --- SAME CAMPUS LAYOUT AS CampusMap.jsx ---
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

  // Same building data as CampusMap.jsx
  const staticBuildings = [
    // --- ENTRANCE & ADMINISTRATION AREA ---
    { id: 'MAIN_GATE', x: 180, y: 20, width: 40, height: 25, label: 'GATE', name: 'Main Entrance', type: 'entrance', color: '#6b7280', zone: 'administration' },
    { id: 'GUARD_HOUSE', x: 140, y: 45, width: 40, height: 25, label: 'GUARD', name: 'Security Gate', type: 'security', color: '#6b7280', zone: 'administration' },
    
    // Administrative Cluster (near entrance)
    { id: 'ADMIN_BUILDING', x: 60, y: 100, width: 60, height: 45, label: 'ADMIN', name: 'Administration', type: 'admin', color: '#7e22ce', zone: 'administration' },
    { id: 'REGISTRAR', x: 130, y: 100, width: 50, height: 40, label: 'REG', name: 'Registrar Office', type: 'admin', color: '#7e22ce', zone: 'administration' },
    { id: 'FINANCE', x: 60, y: 155, width: 50, height: 35, label: 'FIN', name: 'Finance Office', type: 'admin', color: '#7e22ce', zone: 'administration' },
    
    // --- ACADEMIC CORE (Central area) ---
    { id: 'SCIENCE_HALL', x: 180, y: 100, width: 70, height: 50, label: 'SCI', name: 'Science Building', type: 'science', color: '#7c3aed', zone: 'academic' },
    { id: 'ENGINEERING', x: 265, y: 100, width: 70, height: 50, label: 'ENG', name: 'Engineering Hall', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'BUSINESS', x: 350, y: 100, width: 70, height: 50, label: 'BUS', name: 'Business School', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'ARTS_SCIENCES', x: 435, y: 100, width: 70, height: 50, label: 'A&S', name: 'Arts & Sciences', type: 'academic', color: '#1e40af', zone: 'academic' },
    
    // Secondary Academic Buildings
    { id: 'COMPUTER_SCIENCE', x: 180, y: 165, width: 65, height: 45, label: 'CS', name: 'Computer Science', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'MATHEMATICS', x: 260, y: 165, width: 65, height: 45, label: 'MATH', name: 'Mathematics', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'PHYSICS', x: 340, y: 165, width: 65, height: 45, label: 'PHY', name: 'Physics Lab', type: 'science', color: '#7c3aed', zone: 'academic' },
    { id: 'CHEMISTRY', x: 420, y: 165, width: 65, height: 45, label: 'CHEM', name: 'Chemistry Lab', type: 'science', color: '#7c3aed', zone: 'academic' },
    
    // Lecture Halls
    { id: 'LECTURE_HALL_A', x: 500, y: 100, width: 55, height: 40, label: 'LHA', name: 'Lecture Hall A', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'LECTURE_HALL_B', x: 500, y: 165, width: 55, height: 40, label: 'LHB', name: 'Lecture Hall B', type: 'academic', color: '#1e40af', zone: 'academic' },
    
    // --- LIBRARY QUAD ---
    { id: 'MAIN_LIBRARY', x: 180, y: 320, width: 100, height: 60, label: 'LIB', name: 'Main Library', type: 'library', color: '#2563eb', zone: 'library' },
    { id: 'STUDY_CENTER', x: 290, y: 320, width: 60, height: 50, label: 'STUDY', name: 'Study Center', type: 'library', color: '#2563eb', zone: 'library' },
    { id: 'RESEARCH_CENTER', x: 180, y: 390, width: 70, height: 50, label: 'RES', name: 'Research Center', type: 'science', color: '#7c3aed', zone: 'library' },
    
    // --- STUDENT LIFE CENTER ---
    { id: 'STUDENT_CENTER', x: 340, y: 320, width: 85, height: 55, label: 'SC', name: 'Student Center', type: 'student', color: '#dc2626', zone: 'student_life' },
    { id: 'CAFETERIA', x: 435, y: 320, width: 75, height: 50, label: 'CAFE', name: 'Main Cafeteria', type: 'cafeteria', color: '#ea580c', zone: 'student_life' },
    { id: 'BOOKSTORE', x: 520, y: 320, width: 60, height: 40, label: 'BOOK', name: 'Bookstore', type: 'store', color: '#dc2626', zone: 'student_life' },
    { id: 'HEALTH_CENTER', x: 340, y: 385, width: 70, height: 45, label: 'HEALTH', name: 'Health Center', type: 'medical', color: '#dc2626', zone: 'student_life' },
    { id: 'IT_SERVICES', x: 435, y: 385, width: 65, height: 45, label: 'IT', name: 'IT Services', type: 'admin', color: '#7e22ce', zone: 'student_life' },
    
    // --- SPORTS COMPLEX ---
    { id: 'GYMNASIUM', x: 80, y: 370, width: 80, height: 60, label: 'GYM', name: 'Main Gymnasium', type: 'gym', color: '#dc2626', zone: 'sports' },
    { id: 'SWIMMING_POOL', x: 170, y: 470, width: 60, height: 50, label: 'POOL', name: 'Swimming Pool', type: 'sports', color: '#0891b2', zone: 'sports' },
    { id: 'TENNIS_COURTS', x: 80, y: 470, width: 70, height: 40, label: 'TENNIS', name: 'Tennis Courts', type: 'sports', color: '#16a34a', zone: 'sports' },
    { id: 'SPORTS_FIELD', x: 80, y: 520, width: 160, height: 35, label: 'FIELD', name: 'Sports Field', type: 'sports', color: '#16a34a', zone: 'sports' },
    { id: 'TRACK', x: 250, y: 470, width: 80, height: 30, label: 'TRACK', name: 'Running Track', type: 'sports', color: '#16a34a', zone: 'sports' },
    
    // --- RESIDENTIAL AREA ---
    { id: 'DORM_NORTH', x: 580, y: 100, width: 70, height: 50, label: 'DORM N', name: 'North Dormitory', type: 'dorm', color: '#ea580c', zone: 'residential' },
    { id: 'DORM_SOUTH', x: 580, y: 165, width: 70, height: 50, label: 'DORM S', name: 'South Dormitory', type: 'dorm', color: '#ea580c', zone: 'residential' },
    { id: 'DORM_EAST', x: 580, y: 230, width: 70, height: 50, label: 'DORM E', name: 'East Dormitory', type: 'dorm', color: '#ea580c', zone: 'residential' },
    { id: 'DINING_HALL', x: 660, y: 165, width: 80, height: 50, label: 'DINE', name: 'Dining Hall', type: 'cafeteria', color: '#ea580c', zone: 'residential' },
    { id: 'STUDENT_LOUNGE', x: 660, y: 230, width: 70, height: 45, label: 'LOUNGE', name: 'Student Lounge', type: 'student', color: '#ea580c', zone: 'residential' },
    
    // --- ARTS QUAD ---
    { id: 'ART_STUDIO', x: 580, y: 420, width: 70, height: 50, label: 'ART', name: 'Art Studio', type: 'arts', color: '#db2777', zone: 'arts' },
    { id: 'MUSIC_HALL', x: 660, y: 420, width: 70, height: 50, label: 'MUSIC', name: 'Music Hall', type: 'arts', color: '#db2777', zone: 'arts' },
    { id: 'THEATER', x: 580, y: 480, width: 85, height: 50, label: 'THEA', name: 'Auditorium', type: 'arts', color: '#db2777', zone: 'arts' },
    { id: 'MEDIA_CENTER', x: 660, y: 480, width: 70, height: 50, label: 'MEDIA', name: 'Media Center', type: 'arts', color: '#db2777', zone: 'arts' },
    
    // --- PARKING & SERVICES ---
    { id: 'MAIN_PARKING', x: 330, y: 450, width: 100, height: 50, label: 'PARK', name: 'Main Parking Lot', type: 'parking', color: '#6b7280', zone: 'parking' },
    { id: 'FACILITIES', x: 440, y: 450, width: 80, height: 50, label: 'FAC', name: 'Facilities Building', type: 'admin', color: '#6b7280', zone: 'parking' },
    { id: 'CHAPEL', x: 500, y: 480, width: 60, height: 50, label: 'CHAPEL', name: 'Campus Chapel', type: 'religious', color: '#d97706', zone: 'arts' },
    
    // --- ADDITIONAL BUILDINGS ---
    { id: 'ALUMNI_CENTER', x: 660, y: 100, width: 70, height: 45, label: 'ALUMNI', name: 'Alumni Center', type: 'admin', color: '#7e22ce', zone: 'residential' },
    { id: 'CAREER_CENTER', x: 520, y: 385, width: 60, height: 40, label: 'CAREER', name: 'Career Services', type: 'admin', color: '#7e22ce', zone: 'student_life' }
  ];

  // Fetch buildings from database or use static data
  useEffect(() => {
    fetchBuildings();
    
    // Check for pre-selected destination from Info page
    const savedDestination = localStorage.getItem('selectedDestination');
    if (savedDestination) {
      console.log('Found saved destination:', savedDestination);
      setRoute(prev => ({ ...prev, destination: savedDestination }));
      localStorage.removeItem('selectedDestination'); // Clear after use
    }
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching buildings:', error);
        // Use static buildings if database fails
        setBuildings(staticBuildings);
      } else if (data && data.length > 0) {
        // Use database buildings if available
        const formattedBuildings = data.map(b => ({
          id: b.id,
          name: b.building_name,
          label: b.building_code,
          type: b.building_type,
          color: b.color,
          x: b.coordinates?.x || 0,
          y: b.coordinates?.y || 0,
          width: b.coordinates?.width || 60,
          height: b.coordinates?.height || 40,
          zone: b.zone || 'academic'
        }));
        setBuildings(formattedBuildings);
      } else {
        // Use static buildings if no database entries
        setBuildings(staticBuildings);
      }
      
      // Initialize available start points (same as CampusMap)
      const startPoints = [
        { id: 'main_gate', name: 'Main Gate', x: 200, y: 80, type: 'entrance' },
        { id: 'central_quad', name: 'Central Quad', x: 400, y: 140, type: 'landmark' },
        { id: 'student_center', name: 'Student Center Entrance', x: 382, y: 347, type: 'building' },
        { id: 'library_entrance', name: 'Library Entrance', x: 230, y: 350, type: 'building' },
        { id: 'parking_lot', name: 'Parking Lot Entrance', x: 380, y: 475, type: 'parking' },
        { id: 'dorm_entrance', name: 'Dormitory Entrance', x: 615, y: 165, type: 'building' },
        { id: 'gym_entrance', name: 'Gym Entrance', x: 120, y: 400, type: 'building' },
        { id: 'cafeteria_entrance', name: 'Cafeteria Entrance', x: 472, y: 345, type: 'building' }
      ];
      
      setAvailableStartPoints(startPoints);
      
      // Set default user position if not already set
      if (!userPosition) {
        const defaultPosition = startPoints[0]; // Main Gate
        setUserPosition(defaultPosition);
        setRoute(prev => ({ ...prev, start: defaultPosition.name }));
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings(staticBuildings);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Utility functions
  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  const calculateTotalPathDistance = (path) => {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += getDistance(path[i], path[i + 1]);
    }
    return totalDistance;
  };

  // Improved path calculation using actual campus pathways
  const calculatePath = (startPoint, destination) => {
    if (!startPoint || !destination) return [];
    
    const destinationBuilding = buildings.find(b => b.name === destination);
    if (!destinationBuilding) return [];
    
    const destinationPoint = { 
      x: destinationBuilding.x + destinationBuilding.width/2, 
      y: destinationBuilding.y + destinationBuilding.height/2 
    };
    
    const path = [startPoint];
    
    // Calculate path based on zones (using logical pathway routes)
    const startZone = getZoneForPoint(startPoint);
    const destZone = destinationBuilding.zone;
    
    // If same zone, direct path
    if (startZone === destZone) {
      path.push(destinationPoint);
      return path;
    }
    
    // Route through pathway network
    // Main intersections as waypoints
    const intersections = {
      main_gate: { x: 200, y: 80 },
      central_quad: { x: 400, y: 140 },
      library_intersection: { x: 230, y: 320 },
      student_center_intersection: { x: 400, y: 320 },
      sports_intersection: { x: 200, y: 380 },
      residential_intersection: { x: 600, y: 230 },
      arts_intersection: { x: 600, y: 380 }
    };
    
    // Determine route based on zones
    let waypoints = [];
    
    if (startZone === 'administration' || startZone === 'academic') {
      waypoints.push(intersections.central_quad);
    } else if (startZone === 'library' || startZone === 'student_life') {
      waypoints.push(intersections.library_intersection);
    } else if (startZone === 'sports') {
      waypoints.push(intersections.sports_intersection);
    } else if (startZone === 'residential') {
      waypoints.push(intersections.residential_intersection);
    } else if (startZone === 'arts') {
      waypoints.push(intersections.arts_intersection);
    }
    
    // Add destination zone waypoint
    if (destZone === 'academic' || destZone === 'administration') {
      waypoints.push(intersections.central_quad);
    } else if (destZone === 'library' || destZone === 'student_life') {
      waypoints.push(intersections.library_intersection);
    } else if (destZone === 'sports') {
      waypoints.push(intersections.sports_intersection);
    } else if (destZone === 'residential') {
      waypoints.push(intersections.residential_intersection);
    } else if (destZone === 'arts') {
      waypoints.push(intersections.arts_intersection);
    }
    
    // Add waypoints to path
    waypoints.forEach(wp => path.push(wp));
    path.push(destinationPoint);
    
    return path;
  };

  const getZoneForPoint = (point) => {
    for (const [zoneName, zone] of Object.entries(campusZones)) {
      if (point.x >= zone.x && point.x <= zone.x + zone.width &&
          point.y >= zone.y && point.y <= zone.y + zone.height) {
        return zoneName;
      }
    }
    return 'academic'; // Default
  };

  // Map interaction functions
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    startPanRef.current = { 
      x: e.clientX - panX, 
      y: e.clientY - panY 
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newPanX = e.clientX - startPanRef.current.x;
    const newPanY = e.clientY - startPanRef.current.y;
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + ZOOM_STEP, MAX_SCALE));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - ZOOM_STEP, MIN_SCALE));
  const resetView = () => {
    setScale(1.0);
    setPanX(0);
    setPanY(0);
  };

  // Animation Loop
  const animateMovement = (timestamp) => {
    if (!startTime) {
      setStartTime(timestamp - elapsedTime); 
      animationRef.current = requestAnimationFrame(animateMovement);
      return;
    }

    if (isPaused) return;

    const path = currentPathPoints;
    const totalPathDistance = calculateTotalPathDistance(path); 
    const newElapsedTime = (timestamp - startTime);
    const traveledDistance = newElapsedTime * SIMULATED_SPEED;
    const newProgress = Math.min(1, traveledDistance / totalPathDistance);

    let currentDist = 0;
    let x = path[0].x;
    let y = path[0].y;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segmentDistance = getDistance(path[i], path[i + 1]);
      
      if (currentDist + segmentDistance > traveledDistance) {
        const segmentProgress = (traveledDistance - currentDist) / segmentDistance;
        const p1 = path[i];
        const p2 = path[i + 1];
        x = p1.x + (p2.x - p1.x) * segmentProgress;
        y = p1.y + (p2.y - p1.y) * segmentProgress;
        break;
      }
      currentDist += segmentDistance;
    }

    if (newProgress >= 1) {
      setUserPosition(path[path.length - 1]);
      setProgress(100);
      setIsNavigating(false);
      setElapsedTime(0);
      setCurrentStep(stepByStep.length - 1);
      cancelAnimationFrame(animationRef.current);
      return;
    }

    setUserPosition(prev => ({ ...prev, x, y, name: 'Following Route' }));
    setProgress(newProgress * 100);
    setElapsedTime(newElapsedTime);
    
    const stepThreshold = 0.25;
    const newStep = Math.min(stepByStep.length - 1, Math.floor(newProgress / stepThreshold));
    setCurrentStep(newStep);

    animationRef.current = requestAnimationFrame(animateMovement);
  };

  const handleInputChange = (field, value) => {
    const newRoute = {
      ...route,
      [field]: value
    };
    setRoute(newRoute);
    
    if (field === 'destination' && value && userPosition) {
      calculateRoute(newRoute, userPosition);
    } else {
      setRouteInfo(null);
      setStepByStep([]);
      resetNavigation();
    }
  };

  const handleStartPointSelect = (startPoint) => {
    setUserPosition(startPoint);
    setRoute(prev => ({ ...prev, start: startPoint.name }));
    setIsSettingStart(false);
    
    if (route.destination) {
      calculateRoute({ ...route, start: startPoint.name }, startPoint);
    }
  };

  const calculateRoute = (routeData, startPoint) => {
    if (!routeData.destination || !startPoint) return;

    const path = calculatePath(startPoint, routeData.destination);
    const totalPathDistance = calculateTotalPathDistance(path);
    
    const distance = totalPathDistance * 2; // Scale for realistic distances
    const time = Math.ceil(distance / 75); // ~75m per minute walking
    
    const newRouteInfo = {
      distance: `${Math.round(distance)}m`,
      time: `~${time} min`,
      calories: Math.round(distance * 0.04),
      steps: Math.round(distance * 1.3)
    };

    // Generate step-by-step instructions based on path
    const steps = generateStepInstructions(startPoint, routeData.destination, path);
    
    setRouteInfo(newRouteInfo);
    setStepByStep(steps);
  };

  const generateStepInstructions = (start, destination, path) => {
    const steps = [`Start navigation from ${start.name}`];
    
    // Analyze path and generate instructions
    if (path.length > 2) {
      // Check if passing through central quad
      const centralQuad = { x: 400, y: 140 };
      const isNearCentral = path.some(p => getDistance(p, centralQuad) < 50);
      
      if (isNearCentral) {
        steps.push('Proceed through the Central Quad');
      }
      
      // Check if using main pathways
      if (path.length > 3) {
        steps.push('Follow the main campus pathway');
        steps.push('Continue along the designated walkways');
      }
    }
    
    steps.push(`You have arrived at ${destination}`);
    return steps;
  };

  const startNavigation = () => {
    if (!route.destination || !userPosition) {
      alert('Please set both start location and destination');
      return;
    }
    
    const path = calculatePath(userPosition, route.destination);
    if (path.length === 0) return;
    setCurrentPathPoints(path);
    
    setIsNavigating(true);
    setIsPaused(false);
    setCurrentStep(0);
    setProgress(0);
    setStartTime(null);
    setElapsedTime(0);
    
    animationRef.current = requestAnimationFrame(animateMovement);
  };

  const pauseNavigation = () => {
    setIsPaused(true);
    cancelAnimationFrame(animationRef.current);
  };

  const resumeNavigation = () => {
    if (!currentPathPoints.length) return;
    setIsPaused(false);
    animationRef.current = requestAnimationFrame(animateMovement);
  };

  const resetNavigation = () => {
    setIsNavigating(false);
    setIsPaused(false);
    setCurrentStep(0);
    setProgress(0);
    setElapsedTime(0);
    setStartTime(null);
    setCurrentPathPoints([]);
    
    cancelAnimationFrame(animationRef.current);

    if (route.start) {
      const selectedStart = availableStartPoints.find(point => point.name === route.start);
      if (selectedStart) {
        setUserPosition(selectedStart);
      }
    }
  };

  const handleMapClick = (event) => {
    if (!isSettingStart) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 800;
    const y = ((event.clientY - rect.top) / rect.height) * 600;
    
    const customStart = {
      id: 'custom',
      name: 'Custom Location',
      x: Math.max(20, Math.min(780, x)),
      y: Math.max(20, Math.min(580, y)),
      type: 'custom'
    };
    
    handleStartPointSelect(customStart);
  };

  // Map Components (SAME AS CampusMap.jsx)
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

  const Building = ({ b, isDestination }) => (
    <g>
      <rect 
        x={b.x} 
        y={b.y} 
        width={b.width} 
        height={b.height} 
        rx="8" 
        fill="white" 
        stroke={isDestination ? '#10b981' : '#e5e7eb'}
        strokeWidth={isDestination ? '3' : '2'}
        className="drop-shadow-sm"
      />
      <rect 
        x={b.x} 
        y={b.y} 
        width={b.width} 
        height={b.height * 0.3} 
        rx="8" 
        fill={isDestination ? '#10b981' : b.color}
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

  const StartPoint = ({ point, isSelected, isCurrentPosition }) => (
    <g>
      <circle 
        cx={point.x} 
        cy={point.y} 
        r="8" 
        fill={isCurrentPosition ? '#3b82f6' : '#ef4444'}
        stroke="white"
        strokeWidth="2"
      />
      {isCurrentPosition && (
        <circle 
          cx={point.x} 
          cy={point.y} 
          r="12" 
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      )}
    </g>
  );

  const currentPath = userPosition && route.destination ? calculatePath(userPosition, route.destination) : [];
  const destinationBuilding = buildings.find(b => b.name === route.destination);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 flex items-center border-b border-gray-200/50 shadow-sm sticky top-0 z-20">
        <button 
          onClick={() => onNavigate('map')} 
          className="p-2 -ml-2 mr-2 hover:bg-gray-100/80 rounded-full transition-all duration-200 text-gray-700 hover:scale-105"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">GPS Navigation</h1>
          <p className="text-gray-500 text-sm">Step-by-step campus directions</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/90 rounded-xl h-14 px-4 flex items-center border border-gray-300/50 focus-within:border-[#601214] focus-within:ring-2 focus-within:ring-[#601214]/20 transition-all duration-200 shadow-sm">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="🔍 Search buildings, rooms, or facilities..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-gray-900 placeholder-gray-500 outline-none font-medium" 
              />
            </div>
            <button 
              onClick={resetView}
              className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white rounded-xl w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
              title="Reset View"
            >
              <Compass size={20} />
            </button>
          </div>
        </div>

        {/* Location Inputs */}
        <div className="space-y-4 animate-enter">
          {/* Start Location */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-200/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Start Location</label>
              <button 
                onClick={() => setIsSettingStart(!isSettingStart)} 
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Move size={12} />
                {isSettingStart ? 'Cancel Setting' : 'Change/Set on Map'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <MapPin size={20} className="text-[#601214]" />
                <span className="font-medium text-gray-900 text-lg">
                    {userPosition?.name || route.start || 'Select a starting point...'}
                </span>
            </div>
            {isSettingStart && (
              <div className="mt-4 pt-4 border-t border-gray-200 max-h-32 overflow-y-auto">
                {availableStartPoints.map(point => (
                  <button
                    key={point.id}
                    onClick={() => handleStartPointSelect(point)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${userPosition?.name === point.name ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    {point.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-200/50">
            <label htmlFor="destination-select" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Destination</label>
            <select
              id="destination-select"
              value={route.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              className="w-full bg-transparent text-gray-900 outline-none font-medium text-lg appearance-none"
            >
              <option value="">Select your destination...</option>
              {buildings.map((building, index) => (
                <option key={index} value={building.name}>
                  {building.name} ({building.label})
                </option>
              ))}
            </select>
            {route.destination && (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <MapPin size={14} />
                <span>Destination selected: {route.destination}</span>
              </div>
            )}
          </div>
        </div>

        {/* Route Summary */}
        {routeInfo && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50 animate-enter delay-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-[#601214] rounded-full flex items-center justify-center text-white shadow-lg">
                <Navigation2 size={24} fill="currentColor" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Route Summary</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isNavigating ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  {isNavigating ? 'NAVIGATION ACTIVE' : 'ROUTE CALCULATED'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Footprints size={16} />
                  <span className="text-xs font-semibold">DISTANCE</span>
                </div>
                <span className="text-xl font-bold text-blue-800">{routeInfo.distance}</span>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Clock size={16} />
                  <span className="text-xs font-semibold">EST. TIME</span>
                </div>
                <span className="text-xl font-bold text-green-800">{routeInfo.time}</span>
              </div>
            </div>

            {/* Start/Reset Button */}
            <div className="flex items-center justify-center">
              {!isNavigating ? (
                  <button 
                      onClick={startNavigation} 
                      className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 hover:bg-gradient-to-br hover:from-green-600 hover:to-green-700 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                      disabled={!route.destination || !userPosition}
                  >
                      <Navigation2 size={20} /> Start Navigation
                  </button>
              ) : (
                  <button 
                      onClick={resetNavigation} 
                      className="w-full bg-gradient-to-br from-red-500 to-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 hover:bg-gradient-to-br hover:from-red-600 hover:to-red-700 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                      <RotateCcw size={20} /> Reset Navigation
                  </button>
              )}
            </div>
          </div>
        )}

        {/* GPS Navigation Controls */}
        {isNavigating && route.destination && (
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-200/50 animate-enter delay-200">
            <div className="flex flex-col gap-4">
              {/* Next Instruction Display */}
              <div className="flex items-center gap-4 bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      {progress < 100 ? <CornerUpRight size={24} /> : <MapPin size={24} />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-blue-600 uppercase">
                          {progress < 100 ? 'NEXT INSTRUCTION' : 'FINAL DESTINATION'}
                      </p>
                      <h4 className="text-lg font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                          {progress < 100 ? stepByStep[currentStep] : `You've reached ${route.destination}!`}
                      </h4>
                  </div>
              </div>
            
              {/* Pause / Resume Buttons */}
              <div className="flex items-center justify-center gap-4 w-full">
                {isPaused ? (
                  <button 
                    onClick={resumeNavigation} 
                    className="flex-1 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Play size={20} /> Resume
                  </button>
                ) : (
                  <button 
                    onClick={pauseNavigation} 
                    className="flex-1 py-3 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl font-bold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Pause size={20} /> Pause
                  </button>
                )}
                <button 
                    onClick={resetNavigation} 
                    className="py-3 px-6 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                    <RotateCcw size={20} /> Stop
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full mt-2">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-gray-700">Route Progress:</span>
                      <span className="text-blue-600">{Math.round(progress)}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-500 ease-linear" 
                          style={{ width: `${progress}%` }}
                      ></div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Map - SAME AS CampusMap.jsx */}
        {userPosition && !loading && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50 animate-enter delay-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Campus Navigation Map
              </h2>
              <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2">
                <Compass size={16} className="text-[#601214]" />
                <span className="text-xs font-bold text-[#601214] tracking-wider">
                  {isSettingStart ? 'CLICK TO SET START' : isNavigating ? (isPaused ? 'NAVIGATION PAUSED' : 'NAVIGATION ACTIVE') : 'ROUTE MAP'}
                </span>
              </div>
            </div>
            
            <div 
              ref={mapRef} 
              className="bg-gradient-to-br from-green-50/80 to-blue-50/80 rounded-2xl w-full h-80 relative overflow-hidden border-2 border-green-200/50 cursor-grab active:cursor-grabbing shadow-inner"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleMapClick}
            >
              <div 
                className="absolute inset-0" 
                style={{ 
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`, 
                  transformOrigin: '0 0', 
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} 
              >
                <svg 
                  viewBox="0 0 800 600"
                  className="drop-shadow-sm"
                  width="800"
                  height="600"
                  style={{ filter: 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.1))' }}
                >
                  {/* Background with grid */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d1d5db" strokeWidth="0.5" opacity="0.3"/>
                    </pattern>
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
                  
                  {/* Campus Zones */}
                  {Object.values(campusZones).map((zone, index) => (
                    <Zone key={index} zone={zone} />
                  ))}

                  {/* MAIN ROAD SYSTEM - Same as CampusMap */}
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

                  {/* PATHWAY SYSTEM - Same as CampusMap */}
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

                  {/* ROUNDABOUTS & INTERSECTIONS */}
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

                  {/* GREEN SPACES */}
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

                  {/* Buildings */}
                  {buildings.map(b => (
                    <Building 
                      key={b.id} 
                      b={b} 
                      isDestination={destinationBuilding && b.id === destinationBuilding.id} 
                    />
                  ))}

                  {/* Navigation Path and Marker */}
                  {isNavigating && currentPathPoints.length > 0 && (
                    <g>
                      {/* Navigation path */}
                      <path
                        d={`M${currentPathPoints.map(p => `${p.x} ${p.y}`).join(' L')}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeDasharray="8 4"
                        opacity="0.7"
                      />
                      
                      {/* User position marker */}
                      <StartPoint 
                          point={userPosition} 
                          isCurrentPosition={true}
                      />
                    </g>
                  )}
                  
                  {/* Static Start Points */}
                  {!isNavigating && availableStartPoints.map(point => (
                    <StartPoint 
                      key={point.id} 
                      point={point} 
                      isSelected={userPosition && userPosition.name === point.name} 
                      isCurrentPosition={userPosition && userPosition.name === point.name}
                    />
                  ))}

                  {/* "You Are Here" Marker - Central Quad */}
                  <g transform="translate(400, 140)" className="animate-pulse">
                    <circle cx="10" cy="10" r="15" fill="#ef4444" opacity="0.3" />
                    <circle cx="10" cy="10" r="10" fill="#dc2626" opacity="0.6" />
                    <circle cx="10" cy="10" r="5" fill="#b91c1c" />
                    <circle cx="10" cy="10" r="2" fill="white" />
                    <text x="30" y="15" textAnchor="start" className="font-bold" style={{ fontSize: '11px', fill: '#dc2626', fontWeight: 'bold' }}>
                      YOU ARE HERE
                    </text>
                  </g>

                  {/* ROAD MARKINGS */}
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

                  {/* CAMPUS BOUNDARY */}
                  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="5 5" />
                </svg>
              </div>

              {/* Map Controls */}
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

              {/* Scale and Coordinates */}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200/50 shadow-lg">
                <div>Scale: {Math.round(scale * 100)}%</div>
                <div className="text-gray-400">X: {Math.round(panX)} Y: {Math.round(panY)}</div>
              </div>
            </div>
            
            {/* Quick Building Access */}
            {!route.destination && (
                <div className="mt-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-4">Popular Destinations</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {buildings.slice(0, 4).map((building, index) => (
                            <button
                                key={index}
                                onClick={() => handleInputChange('destination', building.name)}
                                className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-left hover:border-[#601214] transition-all duration-300 border border-gray-200/50 shadow-sm hover:shadow-lg hover:scale-105 group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#601214] to-[#8b1a1d] rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <Building2 size={18} />
                                    </div>
                                    <span className="font-bold text-gray-900 text-base">{building.label}</span>
                                </div>
                                <p className="text-gray-600 text-sm">{building.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigate;