
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies: users can access their tenant's documents
CREATE POLICY "Tenant users can view their documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text);

CREATE POLICY "Tenant users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text);

CREATE POLICY "Tenant users can delete their documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text);

-- Enable realtime for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_contacts;
