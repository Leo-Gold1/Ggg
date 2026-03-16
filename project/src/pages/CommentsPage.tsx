import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommentInput } from '../components/comments/CommentInput';
import { CommentList } from '../components/comments/CommentList';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { LogIn, LogOut, Settings, Shield, Bell } from 'lucide-react';
import { useNavigate } from '../hooks/useNavigate';

type SortOption = 'top' | 'new' | 'old' | 'replies';

export function CommentsPage() {
  const { user, profile, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('top');
  const [refreshKey, setRefreshKey] = useState(0);
  const { navigateTo } = useNavigate();

  const pageId = 'demo-page';
  const threadId = 'demo-thread';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Comments</h1>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <button
                    onClick={() => navigateTo('notifications')}
                    className="p-2 hover:bg-gray-100 rounded-lg relative"
                  >
                    <Bell className="w-5 h-5 text-gray-700" />
                  </button>

                  {(profile?.role === 'mod' || profile?.role === 'admin') && (
                    <button
                      onClick={() => navigateTo('moderation')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Shield className="w-4 h-4" />
                      Moderation
                    </button>
                  )}

                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => navigateTo('admin')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Settings className="w-4 h-4" />
                      Admin
                    </button>
                  )}

                  <button
                    onClick={() => navigateTo('profile')}
                    className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg"
                  >
                    {profile?.avatar_url && (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    {!profile?.avatar_url && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {profile?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{profile?.username}</span>
                  </button>

                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {user ? (
            <CommentInput
              pageId={pageId}
              threadId={threadId}
              onCommentAdded={() => setRefreshKey(prev => prev + 1)}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Login to join the conversation</p>
              <button
                onClick={() => setShowLogin(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Login
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Comments</h2>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="top">Top</option>
                <option value="new">Newest</option>
                <option value="old">Oldest</option>
                <option value="replies">Most Replies</option>
              </select>
            </div>
          </div>

          <CommentList key={refreshKey} pageId={pageId} threadId={threadId} sortBy={sortBy} />
        </div>
      </main>

      {showLogin && (
        <LoginForm
          onClose={() => setShowLogin(false)}
          onSwitchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
        />
      )}

      {showSignup && (
        <SignupForm
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
        />
      )}
    </div>
  );
}
