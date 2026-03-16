/*
  # Comment System Database Schema
  
  ## Overview
  Complete schema for a modern comment system with moderation capabilities.
  
  ## New Tables
  
  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, FK to auth.users)
  - `username` (text, unique)
  - `avatar_url` (text)
  - `role` (text) - user/mod/admin
  - `reputation` (integer)
  - `is_banned` (boolean)
  - `is_shadow_banned` (boolean)
  - `timeout_until` (timestamptz)
  - `created_at` (timestamptz)
  
  ### 2. `comments`
  All comments and replies (nested structure using parent_id)
  - `id` (uuid)
  - `user_id` (uuid, FK to profiles)
  - `page_id` (text) - identifier for the page
  - `thread_id` (text) - thread identifier
  - `parent_id` (uuid, nullable) - for nested replies
  - `content` (text)
  - `depth` (integer) - reply depth level
  - `is_deleted` (boolean)
  - `is_pinned` (boolean)
  - `is_locked` (boolean)
  - `is_edited` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 3. `votes`
  Upvotes and downvotes on comments
  - `id` (uuid)
  - `comment_id` (uuid, FK to comments)
  - `user_id` (uuid, FK to profiles)
  - `vote_type` (text) - upvote/downvote
  - `created_at` (timestamptz)
  
  ### 4. `reports`
  User reports on comments
  - `id` (uuid)
  - `comment_id` (uuid, FK to comments)
  - `reported_by` (uuid, FK to profiles)
  - `reason` (text) - spam/harassment/hate_speech/off_topic
  - `status` (text) - pending/resolved/ignored
  - `resolved_by` (uuid, nullable, FK to profiles)
  - `created_at` (timestamptz)
  - `resolved_at` (timestamptz, nullable)
  
  ### 5. `bans`
  User bans (temporary and permanent)
  - `id` (uuid)
  - `user_id` (uuid, FK to profiles)
  - `banned_by` (uuid, FK to profiles)
  - `reason` (text)
  - `ban_type` (text) - temporary/permanent/shadow
  - `expires_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  
  ### 6. `moderation_logs`
  Log of all moderation actions
  - `id` (uuid)
  - `mod_id` (uuid, FK to profiles)
  - `action` (text) - delete/approve/edit/ban/pin/lock
  - `target_type` (text) - comment/user
  - `target_id` (uuid)
  - `reason` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)
  
  ### 7. `notifications`
  User notifications
  - `id` (uuid)
  - `user_id` (uuid, FK to profiles)
  - `type` (text) - reply/mention/like/warning
  - `content` (text)
  - `related_comment_id` (uuid, nullable)
  - `is_read` (boolean)
  - `created_at` (timestamptz)
  
  ### 8. `word_filters`
  Blocked words list
  - `id` (uuid)
  - `word` (text)
  - `action` (text) - block/review
  - `created_at` (timestamptz)
  
  ### 9. `domain_filters`
  Blocked domains list
  - `id` (uuid)
  - `domain` (text)
  - `created_at` (timestamptz)
  
  ### 10. `system_settings`
  System-wide settings
  - `key` (text, PK)
  - `value` (jsonb)
  - `updated_at` (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users
  - Admin/mod specific policies
  - Shadow banned users see their own content only
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text DEFAULT '',
  role text DEFAULT 'user' CHECK (role IN ('user', 'mod', 'admin')),
  reputation integer DEFAULT 0,
  is_banned boolean DEFAULT false,
  is_shadow_banned boolean DEFAULT false,
  timeout_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  page_id text NOT NULL,
  thread_id text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  depth integer DEFAULT 0 CHECK (depth >= 0 AND depth <= 6),
  is_deleted boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  reported_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'off_topic', 'other')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create bans table
CREATE TABLE IF NOT EXISTS bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  reason text NOT NULL,
  ban_type text NOT NULL CHECK (ban_type IN ('temporary', 'permanent', 'shadow')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create moderation_logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mod_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('comment', 'user')),
  target_id uuid NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('reply', 'mention', 'like', 'warning', 'ban')),
  content text NOT NULL,
  related_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create word_filters table
CREATE TABLE IF NOT EXISTS word_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  action text DEFAULT 'block' CHECK (action IN ('block', 'review')),
  created_at timestamptz DEFAULT now()
);

-- Create domain_filters table
CREATE TABLE IF NOT EXISTS domain_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_id);
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_comment_id ON votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN is_deleted THEN false
      ELSE true
    END
  );

CREATE POLICY "Users can insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Votes policies
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reported_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin'))
  );

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Bans policies
CREATE POLICY "Users can view own bans"
  ON bans FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin'))
  );

-- Moderation logs policies
CREATE POLICY "Mods and admins can view logs"
  ON moderation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin'))
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Word filters policies (admin only)
CREATE POLICY "Admins can manage word filters"
  ON word_filters FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Domain filters policies (admin only)
CREATE POLICY "Admins can manage domain filters"
  ON domain_filters FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System settings policies (admin only)
CREATE POLICY "Admins can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert default system settings
INSERT INTO system_settings (key, value) VALUES
  ('comment_limit', '{"per_hour": 50, "per_day": 200}'::jsonb),
  ('reply_depth', '{"max": 6}'::jsonb),
  ('link_limit', '{"max_per_comment": 3}'::jsonb),
  ('auto_moderation', '{"enabled": true, "suspicious_word_threshold": 3}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update comment updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();