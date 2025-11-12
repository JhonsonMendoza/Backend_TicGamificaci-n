-- Migration: create missions table
-- Generated: 2025-11-11

CREATE TABLE IF NOT EXISTS public.missions (
  id SERIAL PRIMARY KEY,
  analysis_run_id integer NOT NULL REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path varchar(1000),
  line_start integer,
  line_end integer,
  severity varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  fixed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_missions_analysis_run_id ON public.missions(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_missions_severity ON public.missions(severity);
CREATE INDEX IF NOT EXISTS idx_missions_status ON public.missions(status);

-- NOTE:
-- If you use TypeORM migrations, you can convert this SQL to a TypeORM migration file.
-- The migration assumes `analysis_runs` table exists and that its primary key is integer.
