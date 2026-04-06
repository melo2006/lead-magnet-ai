
-- Campaign sequences (drip campaigns)
CREATE TABLE public.campaign_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read campaign_sequences" ON public.campaign_sequences FOR SELECT USING (true);
CREATE POLICY "Anyone can insert campaign_sequences" ON public.campaign_sequences FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update campaign_sequences" ON public.campaign_sequences FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete campaign_sequences" ON public.campaign_sequences FOR DELETE USING (true);

-- Sequence steps
CREATE TABLE public.campaign_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID REFERENCES public.campaign_sequences(id) ON DELETE CASCADE NOT NULL,
  step_number INTEGER NOT NULL DEFAULT 1,
  delay_days INTEGER NOT NULL DEFAULT 0,
  email_subject TEXT NOT NULL,
  email_template TEXT NOT NULL DEFAULT 'clean-card',
  template_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read campaign_sequence_steps" ON public.campaign_sequence_steps FOR SELECT USING (true);
CREATE POLICY "Anyone can insert campaign_sequence_steps" ON public.campaign_sequence_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update campaign_sequence_steps" ON public.campaign_sequence_steps FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete campaign_sequence_steps" ON public.campaign_sequence_steps FOR DELETE USING (true);

-- Prospect enrollments in sequences
CREATE TABLE public.prospect_sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID REFERENCES public.campaign_sequences(id) ON DELETE CASCADE NOT NULL,
  prospect_id UUID NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  next_send_at TIMESTAMP WITH TIME ZONE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, prospect_id)
);

ALTER TABLE public.prospect_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prospect_sequence_enrollments" ON public.prospect_sequence_enrollments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert prospect_sequence_enrollments" ON public.prospect_sequence_enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prospect_sequence_enrollments" ON public.prospect_sequence_enrollments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete prospect_sequence_enrollments" ON public.prospect_sequence_enrollments FOR DELETE USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_campaign_sequences_updated_at BEFORE UPDATE ON public.campaign_sequences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaign_sequence_steps_updated_at BEFORE UPDATE ON public.campaign_sequence_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prospect_sequence_enrollments_updated_at BEFORE UPDATE ON public.prospect_sequence_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for enrollments so UI can track progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_sequence_enrollments;
