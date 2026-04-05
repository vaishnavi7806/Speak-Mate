
-- Matchmaking queue
CREATE TABLE public.matchmaking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  english_level text NOT NULL DEFAULT 'intermediate',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert into queue" ON public.matchmaking_queue
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their queue entry" ON public.matchmaking_queue
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their queue entry" ON public.matchmaking_queue
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Peer chat rooms
CREATE TABLE public.peer_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.peer_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their rooms" ON public.peer_rooms
  FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their rooms" ON public.peer_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Peer messages (realtime)
CREATE TABLE public.peer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.peer_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.peer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert messages in their room" ON public.peer_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.peer_rooms
      WHERE id = room_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can view messages in their room" ON public.peer_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.peer_rooms
      WHERE id = room_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- Enable realtime for peer_messages and peer_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
