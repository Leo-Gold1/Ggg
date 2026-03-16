import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatTimeAgo, renderCommentContent } from '../../utils/commentUtils';
import { ThumbsUp, ThumbsDown, MessageCircle, Flag, CreditCard as Edit2, Trash2, Pin, Lock, Shield } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { CommentInput } from './CommentInput';

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  vote_counts?: { upvotes: number; downvotes: number };
  user_vote?: 'upvote' | 'downvote' | null;
  reply_count?: number;
};

interface CommentCardProps {
  comment: Comment;
  onUpdate: () => void;
  onReply?: () => void;
}

export function CommentCard({ comment, onUpdate }: CommentCardProps) {
  const { user, profile } = useAuth();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReportModal, setShowReportModal] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const isMod = profile?.role === 'mod' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) return;

    if (comment.user_vote === voteType) {
      await supabase
        .from('votes')
        .delete()
        .eq('comment_id', comment.id)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('votes')
        .upsert({
          comment_id: comment.id,
          user_id: user.id,
          vote_type: voteType,
        });
    }

    onUpdate();
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from('comments')
      .update({
        content: editContent,
        is_edited: true,
      })
      .eq('id', comment.id);

    if (!error) {
      setIsEditing(false);
      onUpdate();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', comment.id);

    onUpdate();
  };

  const handlePin = async () => {
    await supabase
      .from('comments')
      .update({ is_pinned: !comment.is_pinned })
      .eq('id', comment.id);

    onUpdate();
  };

  const handleLock = async () => {
    await supabase
      .from('comments')
      .update({ is_locked: !comment.is_locked })
      .eq('id', comment.id);

    onUpdate();
  };

  const handleReport = async (reason: string) => {
    if (!user) return;

    await supabase.from('reports').insert({
      comment_id: comment.id,
      reported_by: user.id,
      reason: reason as any,
    });

    setShowReportModal(false);
    alert('Report submitted');
  };

  const getRoleBadge = () => {
    if (comment.profiles.role === 'admin') {
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">ADMIN</span>;
    }
    if (comment.profiles.role === 'mod') {
      return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">MOD</span>;
    }
    return null;
  };

  return (
    <div className="group">
      <div className="flex gap-3">
        {comment.profiles.avatar_url && (
          <img
            src={comment.profiles.avatar_url}
            alt={comment.profiles.username}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
        )}
        {!comment.profiles.avatar_url && (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-medium">
              {comment.profiles.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{comment.profiles.username}</span>
            {getRoleBadge()}
            {comment.is_pinned && (
              <Pin className="w-4 h-4 text-blue-600" />
            )}
            <span className="text-gray-500 text-sm">
              {formatTimeAgo(comment.created_at)}
            </span>
            {comment.is_edited && (
              <span className="text-gray-400 text-xs">(edited)</span>
            )}
          </div>

          <div className="mt-2">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="px-4 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="text-gray-800 break-words"
                dangerouslySetInnerHTML={{ __html: renderCommentContent(comment.content) }}
              />
            )}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote('upvote')}
                className={`p-1 rounded hover:bg-gray-100 ${
                  comment.user_vote === 'upvote' ? 'text-blue-600' : 'text-gray-500'
                }`}
                disabled={!user}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {(comment.vote_counts?.upvotes || 0) - (comment.vote_counts?.downvotes || 0)}
              </span>
              <button
                onClick={() => handleVote('downvote')}
                className={`p-1 rounded hover:bg-gray-100 ${
                  comment.user_vote === 'downvote' ? 'text-red-600' : 'text-gray-500'
                }`}
                disabled={!user}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>

            {!comment.is_locked && comment.depth < 6 && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
                disabled={!user}
              >
                <MessageCircle className="w-4 h-4" />
                Reply
              </button>
            )}

            {isOwner && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-600 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}

            {isMod && (
              <>
                <button
                  onClick={handlePin}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm"
                >
                  <Pin className="w-4 h-4" />
                  {comment.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={handleLock}
                  className="flex items-center gap-1 text-gray-500 hover:text-orange-600 text-sm"
                >
                  <Lock className="w-4 h-4" />
                  {comment.is_locked ? 'Unlock' : 'Lock'}
                </button>
              </>
            )}

            {user && !isOwner && (
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1 text-gray-500 hover:text-red-600 text-sm"
              >
                <Flag className="w-4 h-4" />
                Report
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-4">
              <CommentInput
                pageId={comment.page_id}
                threadId={comment.thread_id}
                parentId={comment.id}
                depth={comment.depth + 1}
                onCommentAdded={() => {
                  setShowReplyInput(false);
                  onUpdate();
                }}
                placeholder="Write a reply..."
              />
            </div>
          )}
        </div>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Report Comment</h3>
            <div className="space-y-2">
              {['spam', 'harassment', 'hate_speech', 'off_topic', 'other'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg capitalize"
                >
                  {reason.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
