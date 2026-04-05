
CREATE POLICY "Users can update their queue entry" ON public.matchmaking_queue
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
