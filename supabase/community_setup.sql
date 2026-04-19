-- ScholarFlow Community Setup
-- Run this in Supabase SQL Editor AFTER schema.sql
-- Enables real authenticated users to participate in community chat

-- Enable RLS on community tables (schema.sql may have missed these)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Drop any old policies first to avoid conflicts
DROP POLICY IF EXISTS "Room messages readable" ON chat_messages;
DROP POLICY IF EXISTS "Own messages write" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated read rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Authenticated create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Read memberships" ON room_members;
DROP POLICY IF EXISTS "Own membership" ON room_members;
DROP POLICY IF EXISTS "Own membership write" ON room_members;
DROP POLICY IF EXISTS "Own membership delete" ON room_members;
DROP POLICY IF EXISTS "Authenticated read messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated post messages" ON chat_messages;

-- chat_rooms: any signed-in user can read and create rooms
CREATE POLICY "Authenticated read rooms" ON chat_rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- room_members: any signed-in user can read memberships and manage their own
CREATE POLICY "Read memberships" ON room_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Own membership write" ON room_members
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Own membership delete" ON room_members
  FOR DELETE USING (student_id = auth.uid());

-- chat_messages: any signed-in user can read all messages; post as themselves
CREATE POLICY "Authenticated read messages" ON chat_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated post messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable Realtime on community tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
