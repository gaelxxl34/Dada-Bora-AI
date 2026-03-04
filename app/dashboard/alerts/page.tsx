'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api-client';

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  chatId: string;
  anonymousName: string;
  message: string;
  triggerMessage: string;
  triggers: string[];
  status: 'new' | 'acknowledged' | 'in-progress' | 'resolved';
  assignedTo?: string;
  crisisType?: string;
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
  notes?: string;
}

interface AlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved24h: number;
}

const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    badge: 'bg-red-600 text-white',
    icon: 'ri-alarm-warning-fill text-red-600',
    pulse: 'animate-pulse',
  },
  high: {
    bg: 'bg-orange-100',
    border: 'border-orange-500',
    badge: 'bg-orange-500 text-white',
    icon: 'ri-error-warning-fill text-orange-500',
    pulse: '',
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    badge: 'bg-yellow-500 text-white',
    icon: 'ri-alert-fill text-yellow-500',
    pulse: '',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    badge: 'bg-blue-400 text-white',
    icon: 'ri-information-fill text-blue-400',
    pulse: '',
  },
};

export default function AlertsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0, critical: 0, high: 0, medium: 0, low: 0, resolved24h: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved'>('active');
  const [resolveNotes, setResolveNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Redirect non-authorized users
  useEffect(() => {
    if (authLoading) return;
    
    if (!userProfile || !['super_admin', 'admin', 'agent'].includes(userProfile.role || '')) {
      router.replace('/dashboard');
    }
  }, [userProfile, authLoading, router]);

  // Real-time alerts listener
  useEffect(() => {
    if (!userProfile) return;

    let q = query(
      collection(db, 'crisisAlerts'),
      orderBy('createdAt', 'desc')
    );

    // Add status filter
    if (statusFilter === 'active') {
      q = query(
        collection(db, 'crisisAlerts'),
        where('status', 'in', ['new', 'acknowledged', 'in-progress']),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'crisisAlerts'),
        where('status', '==', 'resolved'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Alert[];

      // Apply severity filter
      const filteredAlerts = filter === 'all' 
        ? alertsData 
        : alertsData.filter(a => a.severity === filter);

      setAlerts(filteredAlerts);

      // Calculate stats
      const newStats = {
        total: alertsData.length,
        critical: alertsData.filter(a => a.severity === 'critical').length,
        high: alertsData.filter(a => a.severity === 'high').length,
        medium: alertsData.filter(a => a.severity === 'medium').length,
        low: alertsData.filter(a => a.severity === 'low').length,
        resolved24h: 0,
      };
      setStats(newStats);
      setLoading(false);
    }, (error) => {
      console.error('Error loading alerts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, filter, statusFilter]);

  // Play alert sound for critical/high
  useEffect(() => {
    const hasUrgent = alerts.some(a => 
      (a.severity === 'critical' || a.severity === 'high') && a.status === 'new'
    );
    
    if (hasUrgent) {
      // Could add audio alert here
      // const audio = new Audio('/alert.mp3');
      // audio.play();
    }
  }, [alerts]);

  const handleAcknowledge = async (alertId: string) => {
    setProcessingId(alertId);
    try {
      await apiPost('/api/alerts', { action: 'acknowledge', alertId });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    setProcessingId(alertId);
    try {
      await apiPost('/api/alerts', { 
        action: 'resolve', 
        alertId, 
        notes: resolveNotes,
        outcome: 'resolved'
      });
      setSelectedAlert(null);
      setResolveNotes('');
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Crisis Alerts" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-brown"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Crisis Alerts"
      subtitle="Monitor and respond to user safety alerts"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-red-100 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-3">
              <i className="ri-alarm-warning-fill text-2xl text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
                <div className="text-sm text-red-600">Critical</div>
              </div>
            </div>
          </div>
          <div className="bg-orange-100 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-3">
              <i className="ri-error-warning-fill text-2xl text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-700">{stats.high}</div>
                <div className="text-sm text-orange-600">High</div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-100 rounded-xl p-4 border border-yellow-200">
            <div className="flex items-center gap-3">
              <i className="ri-alert-fill text-2xl text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
                <div className="text-sm text-yellow-600">Medium</div>
              </div>
            </div>
          </div>
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <i className="ri-information-fill text-2xl text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.low}</div>
                <div className="text-sm text-blue-600">Low</div>
              </div>
            </div>
          </div>
          <div className="bg-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3">
              <i className="ri-checkbox-circle-fill text-2xl text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.resolved24h}</div>
                <div className="text-sm text-green-600">Resolved (24h)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'active' 
                  ? 'bg-warm-brown text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Active Alerts
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'resolved' 
                  ? 'bg-warm-brown text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Resolved
            </button>
          </div>
          
          <div className="flex gap-2 ml-auto">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === level 
                    ? 'bg-warm-brown text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <i className="ri-shield-check-fill text-5xl text-green-500 mb-4" />
              <p className="text-gray-600">No {statusFilter} alerts at this time</p>
              <p className="text-sm text-gray-400 mt-1">All sisters are safe 💜</p>
            </div>
          ) : (
            alerts.map(alert => {
              const styles = SEVERITY_STYLES[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={`${styles.bg} ${styles.border} border-l-4 rounded-xl p-4 ${styles.pulse}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <i className={`${styles.icon} text-2xl mt-1`} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`${styles.badge} px-2 py-0.5 rounded-full text-xs font-bold uppercase`}>
                            {alert.severity}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {alert.crisisType?.replace('-', ' ')}
                          </span>
                          <span className="text-gray-400 text-sm">•</span>
                          <span className="text-gray-500 text-sm">
                            {formatTime(alert.createdAt)}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {alert.anonymousName}
                        </h3>
                        
                        <p className="text-gray-700 text-sm mb-2">
                          "{alert.triggerMessage}"
                        </p>
                        
                        <div className="flex flex-wrap gap-1">
                          {alert.triggers.slice(0, 3).map((trigger, i) => (
                            <span 
                              key={i}
                              className="bg-white/50 px-2 py-0.5 rounded text-xs text-gray-600"
                            >
                              {trigger}
                            </span>
                          ))}
                        </div>
                        
                        {alert.status !== 'resolved' && (
                          <div className="flex gap-2 mt-3">
                            {alert.status === 'new' && (
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={processingId === alert.id}
                                className="bg-warm-brown text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
                              >
                                {processingId === alert.id ? 'Processing...' : 'Acknowledge'}
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedAlert(alert)}
                              className="bg-white text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/chat?chatId=${alert.chatId}`)}
                              className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                              Open Chat
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        alert.status === 'new' ? 'bg-red-200 text-red-800' :
                        alert.status === 'acknowledged' ? 'bg-yellow-200 text-yellow-800' :
                        alert.status === 'in-progress' ? 'bg-blue-200 text-blue-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`${SEVERITY_STYLES[selectedAlert.severity].bg} p-6 rounded-t-2xl border-b`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <i className={`${SEVERITY_STYLES[selectedAlert.severity].icon} text-3xl`} />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedAlert.crisisType?.replace('-', ' ').toUpperCase()}
                    </h2>
                    <p className="text-gray-600">{selectedAlert.anonymousName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-2xl" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Trigger Message</h3>
                <p className="bg-gray-50 p-3 rounded-lg text-gray-800">
                  "{selectedAlert.triggerMessage}"
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Detected Triggers</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAlert.triggers.map((trigger, i) => (
                    <span key={i} className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">System Message</h3>
                <p className="text-gray-600">{selectedAlert.message}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Resolution Notes</h3>
                <textarea
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  placeholder="Add notes about how this was handled..."
                  className="w-full border border-gray-200 rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-warm-brown focus:border-warm-brown"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => router.push(`/dashboard/chat?chatId=${selectedAlert.chatId}`)}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  <i className="ri-chat-3-line mr-2" />
                  Open Chat
                </button>
                <button
                  onClick={() => handleResolve(selectedAlert.id)}
                  disabled={processingId === selectedAlert.id}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <i className="ri-checkbox-circle-line mr-2" />
                  {processingId === selectedAlert.id ? 'Resolving...' : 'Mark Resolved'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
