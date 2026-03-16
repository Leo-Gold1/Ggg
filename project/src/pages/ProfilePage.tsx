import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { ArrowLeft, MessageCircle, Award } from 'lucide-react';
import { formatTimeAgo } from '../utils/commentUtils';
import { Database } from '../lib/database.types';

type Comment = Database['public']['Tables']['comments']['Row'];

export function ProfilePage() {
  const { profile } = useAuth();
  const { navigateTo } = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      navigateTo('comments');
      return;
    }

    fetchUserComments();
  }, [profile]);

  const fetchUserComments = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setComments(data);
    }

    setLoading(false);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('comments')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start gap-6">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-24 h-24 rounded-full"
              />
            )}
            {!profile.avatar_url && (
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-3xl font-medium">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-gray-900">{profile.username}</h2>
                {profile.role !== 'user' && (
                  <span className={`px-3 py-1 ${
                    profile.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  } text-sm font-medium rounded-full uppercase`}>
                    {profile.role}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>{comments.length} comments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span>{profile.reputation} reputation</span>
                </div>
                <div>
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {profile.is_banned && (
                <div className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg">
                  This account is currently banned
                </div>
              )}

              {profile.timeout_until && new Date(profile.timeout_until) > new Date() && (
                <div className="mt-4 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg">
                  Timed out until {new Date(profile.timeout_until).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Comments</h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="border-l-2 border-gray-200 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                    <span className="text-sm text-gray-400">
                      on {comment.page_id}
                    </span>
                  </div>
                  <p className="text-gray-800">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
