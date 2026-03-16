import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, Plus, Trash2, Shield, Users } from 'lucide-react';
import { Database } from '../lib/database.types';

type WordFilter = Database['public']['Tables']['word_filters']['Row'];
type DomainFilter = Database['public']['Tables']['domain_filters']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export function AdminPage() {
  const { profile } = useAuth();
  const { navigateTo } = useNavigate();
  const [wordFilters, setWordFilters] = useState<WordFilter[]>([]);
  const [domainFilters, setDomainFilters] = useState<DomainFilter[]>([]);
  const [moderators, setModerators] = useState<Profile[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [settings, setSettings] = useState({
    comment_limit: { per_hour: 50, per_day: 200 },
    reply_depth: { max: 6 },
    link_limit: { max_per_comment: 3 },
    auto_moderation: { enabled: true, suspicious_word_threshold: 3 },
  });

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigateTo('comments');
      return;
    }

    fetchData();
  }, [profile]);

  const fetchData = async () => {
    const [wordsResult, domainsResult, modsResult, settingsResult] = await Promise.all([
      supabase.from('word_filters').select('*').order('created_at', { ascending: false }),
      supabase.from('domain_filters').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').in('role', ['mod', 'admin']),
      supabase.from('system_settings').select('*'),
    ]);

    if (wordsResult.data) setWordFilters(wordsResult.data);
    if (domainsResult.data) setDomainFilters(domainsResult.data);
    if (modsResult.data) setModerators(modsResult.data);

    if (settingsResult.data) {
      const settingsMap: any = {};
      settingsResult.data.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      setSettings({ ...settings, ...settingsMap });
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) return;

    await supabase.from('word_filters').insert({
      word: newWord.toLowerCase(),
      action: 'block',
    });

    setNewWord('');
    fetchData();
  };

  const handleRemoveWord = async (id: string) => {
    await supabase.from('word_filters').delete().eq('id', id);
    fetchData();
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    await supabase.from('domain_filters').insert({
      domain: newDomain.toLowerCase(),
    });

    setNewDomain('');
    fetchData();
  };

  const handleRemoveDomain = async (id: string) => {
    await supabase.from('domain_filters').delete().eq('id', id);
    fetchData();
  };

  const handlePromoteToMod = async () => {
    const username = prompt('Enter username to promote to moderator:');
    if (!username) return;

    const { data: user } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (!user) {
      alert('User not found');
      return;
    }

    await supabase.from('profiles').update({ role: 'mod' }).eq('id', user.id);

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'warning',
      content: 'You have been promoted to moderator!',
    });

    fetchData();
    alert('User promoted to moderator');
  };

  const handleDemoteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to demote this user?')) return;

    await supabase.from('profiles').update({ role: 'user' }).eq('id', userId);

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'warning',
      content: 'Your moderator privileges have been revoked.',
    });

    fetchData();
  };

  const handleSaveSettings = async () => {
    await Promise.all([
      supabase.from('system_settings').upsert({
        key: 'comment_limit',
        value: settings.comment_limit,
      }),
      supabase.from('system_settings').upsert({
        key: 'reply_depth',
        value: settings.reply_depth,
      }),
      supabase.from('system_settings').upsert({
        key: 'link_limit',
        value: settings.link_limit,
      }),
      supabase.from('system_settings').upsert({
        key: 'auto_moderation',
        value: settings.auto_moderation,
      }),
    ]);

    alert('Settings saved successfully');
  };

  if (!profile || profile.role !== 'admin') {
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
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
              ADMIN
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment Limit (per hour)
              </label>
              <input
                type="number"
                value={settings.comment_limit.per_hour}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    comment_limit: { ...settings.comment_limit, per_hour: parseInt(e.target.value) },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Reply Depth
              </label>
              <input
                type="number"
                value={settings.reply_depth.max}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reply_depth: { max: parseInt(e.target.value) },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Links Per Comment
              </label>
              <input
                type="number"
                value={settings.link_limit.max_per_comment}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    link_limit: { max_per_comment: parseInt(e.target.value) },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.auto_moderation.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_moderation: { ...settings.auto_moderation, enabled: e.target.checked },
                  })
                }
                className="w-4 h-4 text-blue-600"
              />
              <label className="text-sm font-medium text-gray-700">Enable Auto Moderation</label>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Word Filters</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add blocked word..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddWord}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {wordFilters.map(filter => (
              <div key={filter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{filter.word}</span>
                <button
                  onClick={() => handleRemoveWord(filter.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Domain Filters</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Add blocked domain..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddDomain}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {domainFilters.map(filter => (
              <div key={filter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{filter.domain}</span>
                <button
                  onClick={() => handleRemoveDomain(filter.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Moderators</h2>
            <button
              onClick={handlePromoteToMod}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Users className="w-4 h-4" />
              Promote User
            </button>
          </div>

          <div className="space-y-2">
            {moderators.map(mod => (
              <div key={mod.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {mod.avatar_url && (
                    <img src={mod.avatar_url} alt={mod.username} className="w-10 h-10 rounded-full" />
                  )}
                  {!mod.avatar_url && (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {mod.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{mod.username}</p>
                    <p className="text-sm text-gray-500 capitalize">{mod.role}</p>
                  </div>
                </div>

                {mod.role !== 'admin' && (
                  <button
                    onClick={() => handleDemoteUser(mod.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Demote
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
