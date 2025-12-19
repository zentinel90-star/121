import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Signup from './components/Signup';
import CampusMap from './components/CampusMap';
import Info from './components/Info';
import Navigate from './components/Navigate';
import Announcements from './components/Announcements';
import Schedule from './components/Schedule';
import Loading from './components/Loading';
import AdminPanel from './componentsAdmin/AdminPanel';

export default function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const initComplete = useRef(false);

  // Buildings data
  const [buildings] = useState([
    // Academic Zone
    { id: 'CCS', name: 'College of Computer Studies', type: 'academic', color: '#1e40af' },
    { id: 'SCI', name: 'Science Labs', type: 'science', color: '#7c3aed' },
    { id: 'CBA', name: 'College of Business Administration', type: 'academic', color: '#1e40af' },
    { id: 'CED', name: 'College of Education', type: 'academic', color: '#1e40af' },
    { id: 'ENG', name: 'Engineering Building', type: 'academic', color: '#1e40af' },
    { id: 'MATH', name: 'Mathematics Building', type: 'academic', color: '#1e40af' },
    
    // Student Life Zone
    { id: 'STUD', name: 'Student Center', type: 'student', color: '#dc2626' },
    { id: 'CAF', name: 'Cafeteria', type: 'cafeteria', color: '#ea580c' },
    { id: 'LIB', name: 'Main Library', type: 'library', color: '#2563eb' },
    { id: 'BOOK', name: 'Bookstore', type: 'store', color: '#dc2626' },
    
    // Sports Zone
    { id: 'GYM', name: 'Gymnasium', type: 'gym', color: '#dc2626' },
    { id: 'FIELD', name: 'Sports Field', type: 'sports', color: '#16a34a' },
    { id: 'POOL', name: 'Swimming Pool', type: 'sports', color: '#0891b2' },
    { id: 'TENNIS', name: 'Tennis Courts', type: 'sports', color: '#16a34a' },
    
    // Admin Zone
    { id: 'ADMIN', name: 'Administration', type: 'admin', color: '#7e22ce' },
    { id: 'MED', name: 'Medical Clinic', type: 'medical', color: '#dc2626' },
    { id: 'SEC', name: 'Security', type: 'admin', color: '#7e22ce' },
    
    // Residential Zone
    { id: 'DORM1', name: 'North Dormitory', type: 'dorm', color: '#ea580c' },
    { id: 'DORM2', name: 'South Dormitory', type: 'dorm', color: '#ea580c' },
    { id: 'DORM3', name: 'East Dormitory', type: 'dorm', color: '#ea580c' },
    
    // Arts Zone
    { id: 'ART', name: 'Art Studio', type: 'arts', color: '#db2777' },
    { id: 'MUSIC', name: 'Music Hall', type: 'arts', color: '#db2777' },
    { id: 'THEA', name: 'Theater', type: 'arts', color: '#db2777' },
    
    // Additional Buildings
    { id: 'PARK', name: 'Parking Lot', type: 'parking', color: '#6b7280' },
    { id: 'CHAP', name: 'Chapel', type: 'religious', color: '#d97706' },
    { id: 'RES', name: 'Research Center', type: 'science', color: '#7c3aed' }
  ]);

  // Helper function to create user role entry
  const createUserRoleEntry = async (userId) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          id: userId,
          role: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.warn('Could not create user role entry:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('createUserRoleEntry error:', err);
      return false;
    }
  };

  // Enhanced session check with simplified error handling
  const checkSession = async () => {
    try {
      console.log('🔍 Checking session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session error:', error);
        setIsLoading(false);
        setCurrentView('login');
        return;
      }

      if (!session?.user) {
        console.log('👤 No active session - showing login');
        setIsLoading(false);
        setCurrentView('login');
        return;
      }

      console.log('✅ Session found for:', session.user.email);
      
      // Get user role from database
      let userRole = 'student';
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (roleError) {
          console.warn('Role query error:', roleError);
          await createUserRoleEntry(session.user.id);
          userRole = 'student';
        } else if (roleData) {
          userRole = roleData.role || 'student';
        } else {
          console.log('No role found, creating default student role');
          await createUserRoleEntry(session.user.id);
          userRole = 'student';
        }
      } catch (roleErr) {
        console.warn('Role check exception:', roleErr);
        userRole = 'student';
      }
      
      // Create user object
      const basicUser = {
        ...session.user,
        username: session.user.user_metadata?.username || 
                 session.user.email?.split('@')[0] || 'user',
        full_name: session.user.user_metadata?.full_name || '',
        role: userRole
      };

      console.log('User object created:', basicUser);
      setUser(basicUser);
      
      // Navigate based on role
      if (userRole === 'admin') {
        console.log('🚀 Redirecting to admin panel');
        setCurrentView('admin');
      } else {
        console.log('🗺️ Redirecting to campus map');
        setCurrentView('map');
      }
      
      setIsLoading(false);
      initComplete.current = true;

    } catch (error) {
      console.error('💥 Session check failed:', error);
      setIsLoading(false);
      setCurrentView('login');
    }
  };

  useEffect(() => {
    let mounted = true;

    // Immediate session check
    const initApp = async () => {
      if (!mounted) return;
      
      console.log('🚀 App initializing...');
      
      // Show loading for minimum 300ms for smooth transition
      await new Promise(resolve => setTimeout(resolve, 0));

      if (mounted) {
        await checkSession();
      }
    };

    initApp();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('👤 User session updated');
        await checkSession();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        setCurrentView('login');
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCurrentView('login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSuccess = () => {
    alert('Account created successfully! You can now log in.');
    setCurrentView('login');
  };

  const handleLoginSuccess = async () => {
    console.log('🔄 Manual login success trigger');
    setIsLoading(true);
    await checkSession();
  };

  // RENDER
  const renderView = () => {
    console.log('🎨 Rendering view:', currentView, 'Loading:', isLoading);
    
    if (isLoading) {
      return <Loading />;
    }

    switch (currentView) {
      case 'login': 
        return <Login onNavigate={setCurrentView} onLoginSuccess={handleLoginSuccess} />;
      case 'signup': 
        return <Signup onNavigate={setCurrentView} onSignupSuccess={handleSignupSuccess} />;
      case 'map': 
        return <CampusMap onNavigate={setCurrentView} user={user} buildings={buildings} onLogout={handleLogout} />;
      case 'info': 
        return <Info onNavigate={setCurrentView} buildings={buildings} />;
      case 'navigate': 
        return <Navigate onNavigate={setCurrentView} buildings={buildings} />;
      case 'announcements': 
        return <Announcements onNavigate={setCurrentView} user={user} />;
      case 'schedule': 
        return <Schedule onNavigate={setCurrentView} user={user} />;
      case 'admin': 
        return <AdminPanel onNavigate={setCurrentView} user={user} />;
      default: 
        return <Login onNavigate={setCurrentView} onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {renderView()}
    </div>
  );
}