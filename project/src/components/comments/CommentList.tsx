import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CommentCard } from './CommentCard';
import { Database } from '../../lib/database.types';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  vote_counts?: { upvotes: number; downvotes: number };
  user_vote?: 'upvote' | 'downvote' | null;
  reply_count?: number;
  replies?: Comment[];
};

type SortOption = 'top' | 'new' | 'old' | 'replies';

interface CommentListProps {
  pageId: string;
  threadId: string;
  sortBy?: SortOption;
}

export function CommentList({ pageId, threadId, sortBy = 'top' }: CommentListProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());

  const fetchComments = async () => {
    setLoading(true);

    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (*)
      `)
      .eq('page_id', pageId)
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (commentsError || !commentsData) {
      setLoading(false);
      return;
    }

    const commentIds = commentsData.map(c => c.id);

    const [votesResult, userVotesResult, repliesResult] = await Promise.all([
      supabase
        .from('votes')
        .select('comment_id, vote_type')
        .in('comment_id', commentIds),
      user
        ? supabase
            .from('votes')
            .select('comment_id, vote_type')
            .in('comment_id', commentIds)
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
      supabase
        .from('comments')
        .select('parent_id')
        .in('parent_id', commentIds)
        .eq('is_deleted', false),
    ]);

    const voteCounts = new Map<string, { upvotes: number; downvotes: number }>();
    votesResult.data?.forEach(vote => {
      const current = voteCounts.get(vote.comment_id) || { upvotes: 0, downvotes: 0 };
      if (vote.vote_type === 'upvote') {
        current.upvotes++;
      } else {
        current.downvotes++;
      }
      voteCounts.set(vote.comment_id, current);
    });

    const userVotes = new Map<string, 'upvote' | 'downvote'>();
    userVotesResult.data?.forEach(vote => {
      userVotes.set(vote.comment_id, vote.vote_type as 'upvote' | 'downvote');
    });

    const replyCounts = new Map<string, number>();
    repliesResult.data?.forEach(reply => {
      if (reply.parent_id) {
        replyCounts.set(reply.parent_id, (replyCounts.get(reply.parent_id) || 0) + 1);
      }
    });

    const enrichedComments = commentsData.map(comment => ({
      ...comment,
      vote_counts: voteCounts.get(comment.id) || { upvotes: 0, downvotes: 0 },
      user_vote: userVotes.get(comment.id) || null,
      reply_count: replyCounts.get(comment.id) || 0,
    }));

    const buildCommentTree = (parentId: string | null = null): Comment[] => {
      return enrichedComments
        .filter(c => c.parent_id === parentId)
        .map(comment => ({
          ...comment,
          replies: buildCommentTree(comment.id),
        }));
    };

    let sortedComments = buildCommentTree();

    switch (sortBy) {
      case 'top':
        sortedComments.sort((a, b) => {
          const aScore = (a.vote_counts?.upvotes || 0) - (a.vote_counts?.downvotes || 0);
          const bScore = (b.vote_counts?.upvotes || 0) - (b.vote_counts?.downvotes || 0);
          return bScore - aScore;
        });
        break;
      case 'new':
        sortedComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'old':
        sortedComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'replies':
        sortedComments.sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
        break;
    }

    setComments(sortedComments);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments:${pageId}:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `page_id=eq.${pageId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, threadId, sortBy, user]);

  const toggleThread = (commentId: string) => {
    const newCollapsed = new Set(collapsedThreads);
    if (newCollapsed.has(commentId)) {
      newCollapsed.delete(commentId);
    } else {
      newCollapsed.add(commentId);
    }
    setCollapsedThreads(newCollapsed);
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isCollapsed = collapsedThreads.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
      <div key={comment.id} className={isReply ? 'ml-8 mt-4' : 'mt-6'}>
        <div className="border-l-2 border-gray-200 pl-4">
          <CommentCard comment={comment} onUpdate={fetchComments} />

          {hasReplies && (
            <button
              onClick={() => toggleThread(comment.id)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mt-3 font-medium"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </>
              )}
            </button>
          )}

          {!isCollapsed && hasReplies && (
            <div className="mt-2">
              {comment.replies!.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map(comment => renderComment(comment))}
    </div>
  );
}
