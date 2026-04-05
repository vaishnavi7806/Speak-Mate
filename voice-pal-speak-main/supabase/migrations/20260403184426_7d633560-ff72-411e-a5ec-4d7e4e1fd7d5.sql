
-- Fix: Add UPDATE and DELETE policies for sessions
CREATE POLICY "Users can update their own sessions" ON public.sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Fix: Enable Realtime authorization via RLS on realtime.messages
-- We restrict this by removing realtime publication for sensitive tables
-- and relying on application-level polling instead
ALTER PUBLICATION supabase_realtime DROP TABLE public.matchmaking_queue;
ALTER PUBLICATION supabase_realtime DROP TABLE public.peer_rooms;
ALTER PUBLICATION supabase_realtime DROP TABLE public.peer_messages;
