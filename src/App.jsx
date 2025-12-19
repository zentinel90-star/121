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

  // Buildings data - moved outside of checkSession function
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

  // Enhanced session check with proper error handling
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
        console.log('👤 No active session');
        setIsLoading(false);
        setCurrentView('login');
        return;
      }

      console.log('✅ Session found for:', session.user.email);
      
      // Get user role from database with PROPER error handling
      let userRole = 'student';
      try {
        // Use supabase client directly, not fetch API
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to handle no rows

        console.log('Role query result:', { roleData, roleError });

        if (roleError) {
          console.warn('Role query error:', roleError);
          
          // Check if it's a 406 error (table doesn't exist or RLS issue)
          if (roleError.code === '406' || roleError.message.includes('406')) {
            console.log('Table or permission issue detected, creating user_roles table if needed');
            
            // Try to create table via function call or use service role
            await createUserRoleEntry(session.user.id);
            userRole = 'student';
          }
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

  // Helper function to create user role entry
  const createUserRoleEntry = async (userId) => {
    try {
      // First check if user_roles table exists by trying to insert
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
        
        // If table doesn't exist, we need to create it
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('user_roles table does not exist. Please run the SQL script to create it.');
          return false;
        }
      }
      return true;
    } catch (err) {
      console.warn('createUserRoleEntry error:', err);
      return false;
    }
  };

  // Initialize user_roles table on app start
  const initializeDatabase = async () => {
    try {
      // Try to create user_roles table if it doesn't exist
      // Remove the RPC call since it doesn't exist
      console.log('Skipping database function - not needed');
    } catch (err) {
      console.log('Database initialization skipped:', err.message);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initialize database first
    initializeDatabase();

    // Quick session check with shorter timeout
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.log('⏰ Session check timeout - checking session state');
        checkSession();
      }
    }, 3000);

    // Initial session check
    checkSession();

    // Enhanced auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        console.log('👤 User session updated');
        checkSession();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        setCurrentView('login');
        setIsLoading(false);
      } else if (event === 'USER_UPDATED') {
        console.log('📝 User updated');
        checkSession();
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCurrentView('login');
      setIsLoading(false);
    }
  };

  const handleSignupSuccess = () => {
    alert('Account created successfully! You can now log in.');
    setCurrentView('login');
  };

  const handleLoginSuccess = async () => {
    console.log('🔄 Manual login success trigger');
    await checkSession();
  };

  // RENDER
  const renderView = () => {
    if (isLoading) return <Loading />;

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