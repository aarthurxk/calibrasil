-- Tabela para registrar histórico de importações
CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'csv',
  template_type text NOT NULL DEFAULT 'completo',
  total_rows integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  ignored_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'concluida',
  rolled_back_at timestamp with time zone,
  rolled_back_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela para armazenar itens da importação (para rollback)
CREATE TABLE public.import_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);
CREATE INDEX idx_import_jobs_created_by ON public.import_jobs(created_by);
CREATE INDEX idx_import_job_items_job_id ON public.import_job_items(import_job_id);
CREATE INDEX idx_import_job_items_entity ON public.import_job_items(entity_type, entity_id);

-- Habilitar RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_job_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Somente Admin pode ver e gerenciar
CREATE POLICY "Admin manage import_jobs"
ON public.import_jobs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin manage import_job_items"
ON public.import_job_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));