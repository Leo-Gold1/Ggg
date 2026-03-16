import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useNavigate } from '../hooks/useNavigate';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Trash2,
  Ban,
  Clock,
  Eye,
  Search,
  FileText,
} from 'lucide-react';
import { formatTimeAgo } from '../utils/commentUtils';

type Report = Database['public']['Tables']['reports']['Row'] & {
  comments: Database['public']['Tables']['comments']['Row'] & {
    profiles: Database['public']['Tables']['profiles']['Row'];
  };
  profiles: Database['public']['Tables']['profiles']['Row'];
};

type ModerationLog = Database['public']['Tables']['moderation_logs']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

type Tab = 'dashboard' | 'reports' | 'logs' | 'users';

export function ModerationPage() {
  const { profile } = useAuth();
  const { navigateTo } = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    resolved: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.role !== 'mod' && profile?.role !== 'admin') {
      navigateTo('comments');
      return;
    }

    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);

    const [reportsResult, logsResult, statsResult] = await Promise.all([
      supabase
        .from('reports')
        .select(`
          *,
          comments (
            *,
            profiles (*)
          ),
          profiles (*)
        `)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('moderation_logs')
        .select('*, profiles (*)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('reports').select('status'),
    ]);

    if (reportsResult.data) {
      setReports(reportsResult.data as any);
    }

    if (logsResult.data) {
      setLogs(logsResult.data as any);
    }

    if (statsResult.data) {
      const pending = statsResult.data.filter(r => r.status === 'pending').length;
      const resolved = statsResult.data.filter(r => r.status === 'resolved').length;
      setStats({
        pending,
        resolved,
        total: statsResult.data.length,
      });
    }

    setLoading(false);
  };

  const handleResolveReport = async (reportId: string, commentId: string, action: 'delete' | 'ignore') => {
    if (action === 'delete') {
      await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      if (profile) {
        await supabase.from('moderation_logs').insert({
          mod_id: profile.id,
          action: 'delete_comment',
          target_type: 'comment',
          target_id: commentId,
          reason: 'Reported and deleted',
        });
      }
    }

    await supabase
      .from('reports')
      .update({
        status: action === 'delete' ? 'resolved' : 'ignored',
        resolved_by: profile?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    fetchData();
  };

  const handleBanUser = async (userId: string, banType: 'temporary' | 'permanent' | 'shadow', hours?: number) => {
    if (!profile) return;

    const reason = prompt('Enter ban reason:');
    if (!reason) return;

    const expiresAt = banType === 'temporary' && hours
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from('bans').insert({
      user_id: userId,
      banned_by: profile.id,
      reason,
      ban_type: banType,
      expires_at: expiresAt,
    });

    const updates: any = {};
    if (banType === 'shadow') {
      updates.is_shadow_banned = true;
    } else {
      updates.is_banned = true;
      if (banType === 'temporary' && expiresAt) {
        updates.timeout_until = expiresAt;
      }
    }

    await supabase.from('profiles').update(updates).eq('id', userId);

    await supabase.from('moderation_logs').insert({
      mod_id: profile.id,
      action: `ban_user_${banType}`,
      target_type: 'user',
      target_id: userId,
      reason,
    });

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'ban',
      content: `You have been ${banType === 'permanent' ? 'permanently' : banType === 'shadow' ? 'shadow' : 'temporarily'} banned. Reason: ${reason}`,
    });

    fetchData();
    alert('User banned successfully');
  };

  if (!profile || (profile.role !== 'mod' && profile.role !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('comments')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Moderation Panel</h1>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
              {profile.role.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Reports ({stats.pending})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Users
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Resolved Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Reported Comments</h2>
            </div>

            <div className="divide-y">
              {reports.filter(r => r.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending reports
                </div>
              ) : (
                reports
                  .filter(r => r.status === 'pending')
                  .map(report => (
                    <div key={report.id} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded capitalize">
                              {report.reason.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-gray-500">
                              Reported by @{report.profiles.username}
                            </span>
                            <span className="text-sm text-gray-400">
                              {formatTimeAgo(report.created_at)}
                            </span>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">
                                @{report.comments.profiles.username}
                              </span>
                              <span className="text-sm text-gray-500">
                                Page: {report.comments.page_id}
                              </span>
                            </div>
                            <p className="text-gray-700">{report.comments.content}</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveReport(report.id, report.comment_id, 'delete')}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Comment
                            </button>
                            <button
                              onClick={() => handleResolveReport(report.id, report.comment_id, 'ignore')}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              <Eye className="w-4 h-4" />
                              Ignore
                            </button>
                            <button
                              onClick={() => {
                                const action = confirm('Choose ban type:\nOK = Temporary (24h)\nCancel = Permanent');
                                if (action === true) {
                                  handleBanUser(report.comments.user_id, 'temporary', 24);
                                } else if (action === false) {
                                  handleBanUser(report.comments.user_id, 'permanent');
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                            >
                              <Ban className="w-4 h-4" />
                              Ban User
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Moderation Logs</h2>
            </div>

            <div className="divide-y">
              {logs.map(log => (
                <div key={log.id} className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900">
                        <span className="font-medium">@{log.profiles.username}</span>{' '}
                        <span className="text-gray-600">{log.action.replace('_', ' ')}</span>
                      </p>
                      {log.reason && (
                        <p className="text-sm text-gray-600 mt-1">Reason: {log.reason}</p>
                      )}
                      <p className="text-sm text-gray-400 mt-1">
                        {formatTimeAgo(log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username, comment ID, or thread ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="text-center py-8 text-gray-500">
              Enter a search query to find users
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
