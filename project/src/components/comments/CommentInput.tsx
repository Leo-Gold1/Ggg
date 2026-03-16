import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { validateComment, parseMentions } from '../../utils/commentUtils';
import { Send, Image, Smile } from 'lucide-react';

interface CommentInputProps {
  pageId: string;
  threadId: string;
  parentId?: string;
  depth?: number;
  onCommentAdded?: () => void;
  placeholder?: string;
}

export function CommentInput({
  pageId,
  threadId,
  parentId,
  depth = 0,
  onCommentAdded,
  placeholder = "Write a comment..."
}: CommentInputProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      setError('You must be logged in to comment');
      return;
    }

    const validation = validateComment(content);
    if (!validation.valid) {
      setError(validation.error || 'Invalid comment');
      return;
    }

    setLoading(true);
    setError('');

    const { mentions } = parseMentions(content);

    const { error: insertError } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        page_id: pageId,
        thread_id: threadId,
        parent_id: parentId || null,
        content,
        depth,
      });

    if (insertError) {
      setError('Failed to post comment');
      setLoading(false);
      return;
    }

    if (mentions.length > 0) {
      for (const mention of mentions) {
        const { data: mentionedUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', mention)
          .maybeSingle();

        if (mentionedUser) {
          await supabase.from('notifications').insert({
            user_id: mentionedUser.id,
            type: 'mention',
            content: `@${profile.username} mentioned you in a comment`,
          });
        }
      }
    }

    setContent('');
    setLoading(false);
    onCommentAdded?.();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        {profile?.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
        )}
        {!profile?.avatar_url && (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-medium">
              {profile?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={loading || !user}
          />

          {error && (
            <div className="text-red-600 text-sm mt-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                title="Add emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                title="Add image"
              >
                <Image className="w-5 h-5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !content.trim() || !user}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{loading ? 'Posting...' : 'Post'}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Tip: Use @username to mention, ||spoiler|| for spoilers
          </div>
        </div>
      </div>
    </form>
  );
}
