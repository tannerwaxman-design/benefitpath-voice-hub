
-- Fix overly permissive insert policy - only service role should insert
DROP POLICY "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');
