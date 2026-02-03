import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Bell, X, User, Phone, Calendar } from 'lucide-react';
import type { Lead, LeadAssignment } from '../../types';

interface LeadWithAssignment extends Lead {
  assignment: LeadAssignment;
}

interface NotificationsDropdownProps {
  installerId: string;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

export default function NotificationsDropdown({
  installerId,
  unreadCount,
  onUnreadCountChange,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<LeadWithAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && installerId) {
      loadNotifications();
    }
  }, [isOpen, installerId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('*, leads(*)')
        .eq('installer_id', installerId)
        .eq('is_viewed', false)
        .order('assigned_at', { ascending: false })
        .limit(10);

      if (assignments) {
        const leadsWithAssignment = assignments.map((a) => ({
          ...a.leads,
          assignment: a,
        })) as LeadWithAssignment[];

        setNotifications(leadsWithAssignment);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (assignmentId: string) => {
    try {
      await supabase
        .from('lead_assignments')
        .update({ is_viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', assignmentId);

      setNotifications((prev) => prev.filter((n) => n.assignment.id !== assignmentId));
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  };

  const markAllAsViewed = async () => {
    try {
      await supabase
        .from('lead_assignments')
        .update({ is_viewed: true, viewed_at: new Date().toISOString() })
        .eq('installer_id', installerId)
        .eq('is_viewed', false);

      setNotifications([]);
      onUnreadCountChange(0);
    } catch (error) {
      console.error('Error marking all as viewed:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
            <div>
              <h3 className="font-bold text-gray-900 text-base sm:text-lg">Notifiche</h3>
              <p className="text-xs text-gray-500">
                {unreadCount === 0
                  ? 'Nessuna notifica'
                  : `${unreadCount} nuov${unreadCount === 1 ? 'a' : 'e'} lead`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsViewed}
                  className="text-xs text-[#4a5fc1] hover:text-[#223aa3] font-medium hidden sm:block"
                >
                  Segna tutte lette
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 sm:p-1 hover:bg-gray-100 rounded transition-all"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4a5fc1]"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nessuna nuova notifica</p>
                <p className="text-gray-400 text-xs mt-1">Tutte le lead sono state visualizzate</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3 sm:p-4 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {lead.first_name} {lead.last_name}
                          </h4>
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded mt-1">
                            Nuova Lead
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3 ml-10 sm:ml-12">
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          Assegnata il{' '}
                          {new Date(lead.assignment.assigned_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 ml-10 sm:ml-12">
                      <Link
                        to={`/installer/leads/${lead.id}`}
                        onClick={() => {
                          markAsViewed(lead.assignment.id);
                          setIsOpen(false);
                        }}
                        className="flex-1 text-center bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition-all"
                      >
                        Visualizza Dettagli
                      </Link>
                      <button
                        onClick={() => markAsViewed(lead.assignment.id)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        Segna letta
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Link
                to="/installer/pipeline"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-[#4a5fc1] hover:text-[#223aa3] font-medium"
              >
                Vedi tutte le lead →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
