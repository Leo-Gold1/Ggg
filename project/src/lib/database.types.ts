export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string
          role: 'user' | 'mod' | 'admin'
          reputation: number
          is_banned: boolean
          is_shadow_banned: boolean
          timeout_until: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string
          role?: 'user' | 'mod' | 'admin'
          reputation?: number
          is_banned?: boolean
          is_shadow_banned?: boolean
          timeout_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string
          role?: 'user' | 'mod' | 'admin'
          reputation?: number
          is_banned?: boolean
          is_shadow_banned?: boolean
          timeout_until?: string | null
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          page_id: string
          thread_id: string
          parent_id: string | null
          content: string
          depth: number
          is_deleted: boolean
          is_pinned: boolean
          is_locked: boolean
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          page_id: string
          thread_id: string
          parent_id?: string | null
          content: string
          depth?: number
          is_deleted?: boolean
          is_pinned?: boolean
          is_locked?: boolean
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          page_id?: string
          thread_id?: string
          parent_id?: string | null
          content?: string
          depth?: number
          is_deleted?: boolean
          is_pinned?: boolean
          is_locked?: boolean
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          vote_type: 'upvote' | 'downvote'
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          vote_type: 'upvote' | 'downvote'
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          vote_type?: 'upvote' | 'downvote'
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          comment_id: string
          reported_by: string
          reason: 'spam' | 'harassment' | 'hate_speech' | 'off_topic' | 'other'
          status: 'pending' | 'resolved' | 'ignored'
          resolved_by: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          comment_id: string
          reported_by: string
          reason: 'spam' | 'harassment' | 'hate_speech' | 'off_topic' | 'other'
          status?: 'pending' | 'resolved' | 'ignored'
          resolved_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          comment_id?: string
          reported_by?: string
          reason?: 'spam' | 'harassment' | 'hate_speech' | 'off_topic' | 'other'
          status?: 'pending' | 'resolved' | 'ignored'
          resolved_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
      bans: {
        Row: {
          id: string
          user_id: string
          banned_by: string
          reason: string
          ban_type: 'temporary' | 'permanent' | 'shadow'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          banned_by: string
          reason: string
          ban_type: 'temporary' | 'permanent' | 'shadow'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          banned_by?: string
          reason?: string
          ban_type?: 'temporary' | 'permanent' | 'shadow'
          expires_at?: string | null
          created_at?: string
        }
      }
      moderation_logs: {
        Row: {
          id: string
          mod_id: string
          action: string
          target_type: 'comment' | 'user'
          target_id: string
          reason: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          mod_id: string
          action: string
          target_type: 'comment' | 'user'
          target_id: string
          reason?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          mod_id?: string
          action?: string
          target_type?: 'comment' | 'user'
          target_id?: string
          reason?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'reply' | 'mention' | 'like' | 'warning' | 'ban'
          content: string
          related_comment_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'reply' | 'mention' | 'like' | 'warning' | 'ban'
          content: string
          related_comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'reply' | 'mention' | 'like' | 'warning' | 'ban'
          content?: string
          related_comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      word_filters: {
        Row: {
          id: string
          word: string
          action: 'block' | 'review'
          created_at: string
        }
        Insert: {
          id?: string
          word: string
          action?: 'block' | 'review'
          created_at?: string
        }
        Update: {
          id?: string
          word?: string
          action?: 'block' | 'review'
          created_at?: string
        }
      }
      domain_filters: {
        Row: {
          id: string
          domain: string
          created_at: string
        }
        Insert: {
          id?: string
          domain: string
          created_at?: string
        }
        Update: {
          id?: string
          domain?: string
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
      }
    }
  }
}
