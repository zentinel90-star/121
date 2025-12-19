import React, { useState, useEffect } from 'react';
import { Settings, Bell, Calendar, Plus, Trash2, X, BarChart3, Shield, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AdminPanel = ({ onNavigate, user }) => {
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [databaseError, setDatabaseError] = useState('');

  // Form states
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  // Form data
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'normal',
    expires_at: ''
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    building_id: '',
    start_time: '',
    end_time: '',
    event_type: 'academic'
  });

  // Check if user is admin
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    
    try {
      console.log('Checking admin status for user:', user.id);
      
      // Use supabase client with proper error handling
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();  // Changed from .single() to .maybeSingle()

      console.log('Admin check result:', { data, error });

      if (error) {
        console.error('Admin check error:', error);
        setDatabaseError('Database error: ' + error.message);
        
        // If 406 error, table likely doesn't exist or has RLS issues
        if (error.code === '406' || error.message.includes('406')) {
          setDatabaseError('Database configuration issue. The user_roles table may not exist or has permission issues.');
        }
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (data && data.role === 'admin') {
        console.log('User is admin, fetching data...');
        setIsAdmin(true);
        setDatabaseError('');
        fetchAllData();
      } else {
        console.log('User is not admin or no role found');
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setDatabaseError('Unexpected error: ' + error.message);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch announcements
      console.log('Fetching announcements...');
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error('Error fetching announcements:', announcementsError);
        setDatabaseError(prev => prev + '\nAnnouncements error: ' + announcementsError.message);
      } else {
        console.log('Announcements fetched:', announcementsData?.length || 0);
      }

      // Fetch events
      console.log('Fetching events...');
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        setDatabaseError(prev => prev + '\nEvents error: ' + eventsError.message);
      } else {
        console.log('Events fetched:', eventsData?.length || 0);
      }

      setAnnouncements(announcementsData || []);
      setEvents(eventsData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setDatabaseError('Fetch error: ' + error.message);
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          ...announcementForm,
          created_by: user.id,
          expires_at: announcementForm.expires_at || null,
          is_active: true
        }])
        .select();

      if (error) throw error;

      setShowAnnouncementForm(false);
      setAnnouncementForm({
        title: '',
        content: '',
        type: 'general',
        priority: 'normal',
        expires_at: ''
      });
      fetchAllData();
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Error creating announcement: ' + error.message);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          ...eventForm,
          is_active: true
        }])
        .select();

      if (error) throw error;

      setShowEventForm(false);
      setEventForm({
        title: '',
        description: '',
        location: '',
        building_id: '',
        start_time: '',
        end_time: '',
        event_type: 'academic'
      });
      fetchAllData();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event: ' + error.message);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Error deleting announcement: ' + error.message);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event: ' + error.message);
    }
  };

  const toggleAnnouncementStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert('Error updating announcement: ' + error.message);
    }
  };

  const toggleEventStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Error updating event: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onNavigate('login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Admin access denied view
  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-gray-200/50 text-center max-w-md animate-enter">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-[#601214]" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          
          {databaseError && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg text-sm text-left">
              <p className="font-semibold">Database Issue:</p>
              <p className="text-xs mt-1">{databaseError}</p>
            </div>
          )}
          
          <p className="text-gray-600 mb-4">
            {databaseError 
              ? 'There seems to be a database configuration issue.'
              : 'You don\'t have administrator privileges to access this panel.'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('map')}
              className="w-full bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
            >
              Return to Campus Map
            </button>
            
            {databaseError && (
              <button
                onClick={checkAdminStatus}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200"
              >
                Retry Admin Check
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#601214] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
          {databaseError && (
            <p className="mt-2 text-sm text-red-600 max-w-md">{databaseError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col text-gray-900">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 flex items-center justify-between border-b border-gray-200/50 shadow-sm sticky top-0 z-20">
        <div className="flex items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] p-2 rounded-xl shadow-lg">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-500 text-sm">Manage campus content</p>
            </div>
          </div>
        </div>
        
        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="flex overflow-x-auto no-scrollbar px-6">
          {[
            { id: 'announcements', label: 'Announcements', icon: Bell },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#601214] text-[#601214]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 animate-enter">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Manage Announcements</h2>
              <button
                onClick={() => setShowAnnouncementForm(true)}
                className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <Plus size={18} />
                New Announcement
              </button>
            </div>

            {/* Announcement Form */}
            {showAnnouncementForm && (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Create New Announcement</h3>
                  <button onClick={() => setShowAnnouncementForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      placeholder="Enter announcement title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                    <textarea
                      required
                      rows={4}
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      placeholder="Enter announcement content"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={announcementForm.type}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      >
                        <option value="general">General</option>
                        <option value="emergency">Emergency</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="event">Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={announcementForm.priority}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
                    <input
                      type="datetime-local"
                      value={announcementForm.expires_at}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, expires_at: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                    >
                      Create Announcement
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnnouncementForm(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Announcements List */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              {announcements.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="text-gray-300 mx-auto mb-3" size={48} />
                  <p className="text-gray-500">No announcements yet</p>
                  {databaseError && (
                    <p className="text-sm text-red-600 mt-2">{databaseError}</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {announcement.priority}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              announcement.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {announcement.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{announcement.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Type: {announcement.type}</span>
                            <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                            {announcement.expires_at && (
                              <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                            className={`p-2 rounded-lg ${
                              announcement.is_active ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                            } hover:opacity-80 transition-opacity`}
                            title={announcement.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {announcement.is_active ? 'Pause' : 'Play'}
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6 animate-enter">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Manage Events</h2>
              <button
                onClick={() => setShowEventForm(true)}
                className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <Plus size={18} />
                New Event
              </button>
            </div>

            {/* Event Form */}
            {showEventForm && (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Create New Event</h3>
                  <button onClick={() => setShowEventForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      placeholder="Enter event title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      placeholder="Enter event description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                      <input
                        type="text"
                        required
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                        placeholder="Enter location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                      <select
                        value={eventForm.event_type}
                        onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      >
                        <option value="academic">Academic</option>
                        <option value="social">Social</option>
                        <option value="sports">Sports</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={eventForm.start_time}
                        onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={eventForm.end_time}
                        onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#601214] focus:border-[#601214] transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                    >
                      Create Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEventForm(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Events List */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="text-gray-300 mx-auto mb-3" size={48} />
                  <p className="text-gray-500">No events yet</p>
                  {databaseError && (
                    <p className="text-sm text-red-600 mt-2">{databaseError}</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50">
                  {events.map((event) => (
                    <div key={event.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.event_type === 'academic' ? 'bg-blue-100 text-blue-800' :
                              event.event_type === 'social' ? 'bg-green-100 text-green-800' :
                              event.event_type === 'sports' ? 'bg-red-100 text-red-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {event.event_type}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {event.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Location: {event.location}</span>
                            <span>Start: {new Date(event.start_time).toLocaleString()}</span>
                            <span>End: {new Date(event.end_time).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleEventStatus(event.id, event.is_active)}
                            className={`p-2 rounded-lg ${
                              event.is_active ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                            } hover:opacity-80 transition-opacity`}
                            title={event.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {event.is_active ? 'Pause' : 'Play'}
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-enter">
            <h2 className="text-xl font-bold text-gray-900">System Analytics</h2>
            
            {databaseError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800 text-sm">{databaseError}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Bell className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{announcements.length}</p>
                    <p className="text-sm text-gray-500">Total Announcements</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                    <p className="text-sm text-gray-500">Total Events</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[...announcements, ...events]
                  .sort((a, b) => new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time))
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.title ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {item.title ? (
                          <Bell className="text-blue-600" size={16} />
                        ) : (
                          <Calendar className="text-green-600" size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {item.title || 'New Event Created'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.created_at || item.start_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;