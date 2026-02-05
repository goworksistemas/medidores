-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agendamentos_rh (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidato_id bigint NOT NULL,
  vaga_id bigint,
  tipo text NOT NULL,
  data_hora timestamp with time zone NOT NULL,
  duracao_minutos integer DEFAULT 30,
  local_ou_link text,
  entrevistador text,
  status text DEFAULT 'agendado'::text,
  observacoes text,
  lembrete_enviado boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agendamentos_rh_pkey PRIMARY KEY (id),
  CONSTRAINT agendamentos_rh_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id),
  CONSTRAINT agendamentos_rh_vaga_id_fkey FOREIGN KEY (vaga_id) REFERENCES public.vagas(id)
);
CREATE TABLE public.base_conhecimento_rh (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo text,
  conteudo text NOT NULL,
  categoria text,
  tags ARRAY,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT base_conhecimento_rh_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bia_agendamentos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidato_id bigint NOT NULL,
  vaga_id bigint,
  tipo text NOT NULL,
  data_hora timestamp with time zone NOT NULL,
  duracao_minutos integer DEFAULT 30,
  local_ou_link text,
  entrevistador text,
  status text DEFAULT 'agendado'::text,
  observacoes text,
  lembrete_enviado boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_agendamentos_pkey PRIMARY KEY (id),
  CONSTRAINT bia_agendamentos_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.bia_candidatos(id),
  CONSTRAINT bia_agendamentos_vaga_id_fkey FOREIGN KEY (vaga_id) REFERENCES public.bia_vagas(id)
);
CREATE TABLE public.bia_base_conhecimento (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo text,
  conteudo text NOT NULL,
  categoria text,
  tags ARRAY,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_base_conhecimento_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bia_candidatos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  telefone text NOT NULL UNIQUE,
  nome text,
  email text,
  cpf text,
  data_nascimento date,
  cidade text,
  estado text,
  escolaridade text,
  formacao text,
  experiencia_resumo text,
  experiencia_anos integer,
  area_atuacao text,
  cargo_atual text,
  empresa_atual text,
  pretensao_salarial numeric,
  disponibilidade_inicio text,
  disponibilidade_horario text,
  possui_cnh text,
  possui_veiculo boolean DEFAULT false,
  pcd boolean DEFAULT false,
  pcd_descricao text,
  como_conheceu text,
  observacoes text,
  resumo_perfil text,
  status text DEFAULT 'novo'::text,
  etapa_funil text DEFAULT 'primeiro_contato'::text,
  score_fit integer,
  fonte text,
  tags ARRAY,
  primeiro_contato timestamp with time zone DEFAULT now(),
  ultimo_contato timestamp with time zone,
  total_interacoes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_candidatos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bia_candidaturas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidato_id bigint NOT NULL,
  vaga_id bigint NOT NULL,
  status text DEFAULT 'aplicado'::text,
  etapa_atual text,
  feedback_rh text,
  feedback_gestor text,
  nota_entrevista integer,
  motivo_reprovacao text,
  data_aplicacao timestamp with time zone DEFAULT now(),
  data_ultima_atualizacao timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_candidaturas_pkey PRIMARY KEY (id),
  CONSTRAINT bia_candidaturas_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.bia_candidatos(id),
  CONSTRAINT bia_candidaturas_vaga_id_fkey FOREIGN KEY (vaga_id) REFERENCES public.bia_vagas(id)
);
CREATE TABLE public.bia_chat_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text NOT NULL,
  candidato_id bigint,
  telefone text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  tipo_mensagem text,
  intencao_detectada text,
  dados_extraidos jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT bia_chat_history_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.bia_candidatos(id)
);
CREATE TABLE public.bia_config (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  chave text NOT NULL UNIQUE,
  valor text,
  descricao text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bia_log_interacoes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidato_id bigint,
  telefone text,
  tipo_acao text NOT NULL,
  descricao text,
  dados_adicionais jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_log_interacoes_pkey PRIMARY KEY (id),
  CONSTRAINT bia_log_interacoes_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.bia_candidatos(id)
);
CREATE TABLE public.bia_scripts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome text NOT NULL,
  categoria text,
  conteudo text NOT NULL,
  variaveis ARRAY,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_scripts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bia_vagas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo text NOT NULL,
  descricao text,
  requisitos text,
  beneficios text,
  salario_min numeric,
  salario_max numeric,
  tipo_contrato text,
  modalidade text,
  local_trabalho text,
  departamento text,
  quantidade_vagas integer DEFAULT 1,
  status text DEFAULT 'aberta'::text,
  prioridade text DEFAULT 'normal'::text,
  data_abertura timestamp with time zone DEFAULT now(),
  data_fechamento timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bia_vagas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.candidatos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  telefone text NOT NULL UNIQUE,
  nome text,
  email text,
  cpf text,
  data_nascimento date,
  cidade text,
  estado text,
  escolaridade text,
  formacao text,
  experiencia_resumo text,
  experiencia_anos integer,
  area_atuacao text,
  cargo_atual text,
  empresa_atual text,
  pretensao_salarial numeric,
  disponibilidade_inicio text,
  disponibilidade_horario text,
  possui_cnh text,
  possui_veiculo boolean DEFAULT false,
  pcd boolean DEFAULT false,
  pcd_descricao text,
  como_conheceu text,
  observacoes text,
  resumo_perfil text,
  status text DEFAULT 'novo'::text,
  etapa_funil text DEFAULT 'primeiro_contato'::text,
  score_fit integer,
  fonte text,
  tags ARRAY,
  primeiro_contato timestamp with time zone DEFAULT now(),
  ultimo_contato timestamp with time zone,
  total_interacoes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT candidatos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.candidaturas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidato_id bigint NOT NULL,
  vaga_id bigint NOT NULL,
  status text DEFAULT 'aplicado'::text,
  etapa_atual text,
  feedback_rh text,
  feedback_gestor text,
  nota_entrevista integer,
  motivo_reprovacao text,
  data_aplicacao timestamp with time zone DEFAULT now(),
  data_ultima_atualizacao timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT candidaturas_pkey PRIMARY KEY (id),
  CONSTRAINT candidaturas_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id),
  CONSTRAINT candidaturas_vaga_id_fkey FOREIGN KEY (vaga_id) REFERENCES public.vagas(id)
);
CREATE TABLE public.chat_history_rh (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text NOT NULL,
  candidato_id bigint,
  telefone text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  tipo_mensagem text,
  intencao_detectada text,
  dados_extraidos jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_history_rh_pkey PRIMARY KEY (id),
  CONSTRAINT chat_history_rh_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id)
);
CREATE TABLE public.config_bia_rh (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  chave text NOT NULL UNIQUE,
  valor text,
  descricao text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT config_bia_rh_pkey PRIMARY KEY (id)
);
CREATE TABLE public.log_interacoes_rh (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidato_id bigint,
  telefone text,
  tipo_acao text NOT NULL,
  descricao text,
  dados_adicionais jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT log_interacoes_rh_pkey PRIMARY KEY (id),
  CONSTRAINT log_interacoes_rh_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id)
);
CREATE TABLE public.med_energia (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  medidor_id bigint NOT NULL,
  leitura numeric NOT NULL,
  data_hora timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  foto_url text,
  usuario text,
  observacao text,
  justificativa text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT med_energia_pkey PRIMARY KEY (id),
  CONSTRAINT fk_medidor_energia FOREIGN KEY (medidor_id) REFERENCES public.med_medidores(id)
);
CREATE TABLE public.med_hidrometros (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  medidor_id bigint NOT NULL,
  leitura numeric NOT NULL,
  data_hora timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  foto_url text,
  usuario text,
  observacao text,
  justificativa text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT med_hidrometros_pkey PRIMARY KEY (id),
  CONSTRAINT fk_medidor_agua FOREIGN KEY (medidor_id) REFERENCES public.med_medidores(id)
);
CREATE TABLE public.med_medidores (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['agua'::text, 'energia'::text])),
  unidade text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  local_unidade text,
  andar text,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT med_medidores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text,
  email text UNIQUE,
  photo text,
  role text DEFAULT 'user'::text,
  export text,
  view text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  access_medicoes boolean DEFAULT true,
  access_dp_rh boolean DEFAULT false,
  allowed_tabs ARRAY DEFAULT ARRAY['home'::text, 'funcionarios'::text, 'equipamentos'::text, 'onboarding'::text, 'calendario'::text, 'documentos'::text, 'avaliacoes'::text, 'quick-actions'::text, 'reports'::text, 'admin'::text],
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.rh_acoes_rapidas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo character varying NOT NULL,
  colaborador_id uuid,
  executado_por uuid,
  dados jsonb,
  status character varying DEFAULT 'executado'::character varying,
  observacoes text,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_acoes_rapidas_pkey PRIMARY KEY (id),
  CONSTRAINT rh_acoes_rapidas_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.rh_colaboradores(id),
  CONSTRAINT rh_acoes_rapidas_executado_por_fkey FOREIGN KEY (executado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_acoes_rapidas_old (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo character varying NOT NULL,
  colaborador_id text,
  executado_por uuid,
  dados jsonb,
  status character varying DEFAULT 'executado'::character varying,
  observacoes text,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_acoes_rapidas_old_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_ativos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo USER-DEFINED NOT NULL,
  identificador text,
  usuario_atual text,
  matricula text,
  departamento_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'disponivel'::status_ativo,
  marca text,
  modelo text,
  chip text,
  imei_1 text,
  imei_2 text,
  acessorios text,
  numero_serie text,
  motivo text,
  empresa text,
  codigo_empresa text,
  local text,
  ultimo_usuario text,
  observacoes text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  legacy_row_id text UNIQUE,
  CONSTRAINT rh_ativos_pkey PRIMARY KEY (id),
  CONSTRAINT rh_ativos_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.rh_departamentos(id)
);
CREATE TABLE public.rh_ativos_anexos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ativo_id uuid NOT NULL,
  arquivo_url text NOT NULL,
  nome_arquivo character varying,
  tipo_arquivo character varying,
  usuario character varying,
  usuario_id uuid,
  criado_em timestamp with time zone DEFAULT now(),
  legacy_row_id text UNIQUE,
  CONSTRAINT rh_ativos_anexos_pkey PRIMARY KEY (id),
  CONSTRAINT rh_ativos_anexos_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES public.rh_ativos(id),
  CONSTRAINT rh_ativos_anexos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_ativos_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ativo_id uuid NOT NULL,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  usuario character varying,
  usuario_id uuid,
  comentario text NOT NULL,
  legacy_row_id text UNIQUE,
  CONSTRAINT rh_ativos_historico_pkey PRIMARY KEY (id),
  CONSTRAINT rh_ativos_historico_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES public.rh_ativos(id),
  CONSTRAINT rh_ativos_historico_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_avaliacoes_comportamentais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_id uuid,
  colaborador_nome character varying NOT NULL,
  avaliador_nome character varying NOT NULL,
  tipo_avaliacao USER-DEFINED NOT NULL,
  avaliacoes_tecnicas jsonb NOT NULL,
  avaliacoes_emocionais jsonb NOT NULL,
  observacoes text,
  media_tecnica numeric NOT NULL,
  media_emocional numeric NOT NULL,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_avaliacoes_comportamentais_pkey PRIMARY KEY (id),
  CONSTRAINT rh_avaliacoes_comportamentais_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.rh_colaboradores(id),
  CONSTRAINT rh_avaliacoes_comportamentais_criado_por_fkey1 FOREIGN KEY (criado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_avaliacoes_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  colaborador_nome character varying NOT NULL,
  tipo_avaliacao USER-DEFINED NOT NULL,
  token character varying NOT NULL UNIQUE,
  avaliador_nome character varying,
  avaliador_email character varying,
  usado boolean DEFAULT false,
  expira_em timestamp with time zone,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  usado_em timestamp with time zone,
  CONSTRAINT rh_avaliacoes_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT rh_avaliacoes_tokens_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.rh_colaboradores(id),
  CONSTRAINT rh_avaliacoes_tokens_criado_por_fkey1 FOREIGN KEY (criado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_calendario_alertas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  evento_id uuid,
  dias_antes integer NOT NULL,
  mensagem text NOT NULL,
  prioridade USER-DEFINED DEFAULT 'normal'::prioridade_tipo,
  enviado boolean DEFAULT false,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_calendario_alertas_pkey PRIMARY KEY (id),
  CONSTRAINT rh_calendario_alertas_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.rh_calendario_eventos(id)
);
CREATE TABLE public.rh_calendario_alertas_old (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  evento_id uuid,
  dias_antes integer NOT NULL,
  mensagem text NOT NULL,
  prioridade character varying DEFAULT 'normal'::character varying,
  enviado boolean DEFAULT false,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_calendario_alertas_old_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_calendario_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_id uuid,
  departamento_id uuid,
  tipo_evento character varying NOT NULL,
  titulo character varying NOT NULL,
  descricao text,
  data_evento date NOT NULL,
  hora_evento time without time zone,
  cor character varying,
  status USER-DEFINED DEFAULT 'pendente'::status_evento,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_calendario_eventos_pkey PRIMARY KEY (id),
  CONSTRAINT rh_calendario_eventos_colaborador_id_fkey1 FOREIGN KEY (colaborador_id) REFERENCES public.rh_colaboradores(id),
  CONSTRAINT rh_calendario_eventos_departamento_id_fkey1 FOREIGN KEY (departamento_id) REFERENCES public.rh_departamentos(id),
  CONSTRAINT rh_calendario_eventos_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_colaboradores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  cargo character varying,
  departamento_id uuid,
  data_entrada date,
  data_saida date,
  etapa_id character varying,
  foto_url text,
  matricula text,
  email character varying,
  telefone character varying,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  legacy_id text UNIQUE,
  telefone_pessoal character varying,
  CONSTRAINT rh_colaboradores_pkey PRIMARY KEY (id),
  CONSTRAINT rh_colaboradores_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.rh_departamentos(id),
  CONSTRAINT rh_colaboradores_etapa_id_fkey1 FOREIGN KEY (etapa_id) REFERENCES public.rh_etapas(id)
);
CREATE TABLE public.rh_configuracoes (
  chave character varying NOT NULL,
  valor jsonb NOT NULL,
  descricao text,
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_configuracoes_pkey PRIMARY KEY (chave)
);
CREATE TABLE public.rh_departamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL UNIQUE,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  legacy_row_id text UNIQUE,
  CONSTRAINT rh_departamentos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_documentos_gerados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  colaborador_id uuid,
  numero character varying UNIQUE,
  url_pdf text,
  dados_usados jsonb,
  gerado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_documentos_gerados_pkey PRIMARY KEY (id),
  CONSTRAINT rh_documentos_gerados_template_id_fkey1 FOREIGN KEY (template_id) REFERENCES public.rh_documentos_templates(id),
  CONSTRAINT rh_documentos_gerados_colaborador_id_fkey1 FOREIGN KEY (colaborador_id) REFERENCES public.rh_colaboradores(id),
  CONSTRAINT rh_documentos_gerados_gerado_por_fkey1 FOREIGN KEY (gerado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_documentos_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo character varying NOT NULL UNIQUE,
  nome character varying NOT NULL,
  conteudo text NOT NULL,
  variaveis jsonb,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_documentos_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_etapas (
  id character varying NOT NULL,
  tipo USER-DEFINED NOT NULL,
  nome character varying NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_etapas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_kanban_cartoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_id uuid,
  coluna character varying NOT NULL DEFAULT 'L-1'::character varying,
  posicao integer DEFAULT 0,
  data_inicio date DEFAULT CURRENT_DATE,
  data_prevista date,
  tem_notebook boolean DEFAULT false,
  tem_celular boolean DEFAULT false,
  tem_acessos boolean DEFAULT false,
  prioridade USER-DEFINED DEFAULT 'normal'::prioridade_tipo,
  observacoes text,
  responsavel_id uuid,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_kanban_cartoes_pkey PRIMARY KEY (id),
  CONSTRAINT rh_kanban_cartoes_colaborador_id_fkey1 FOREIGN KEY (colaborador_id) REFERENCES public.rh_colaboradores(id),
  CONSTRAINT rh_kanban_cartoes_responsavel_id_fkey1 FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_kanban_comentarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartao_id uuid NOT NULL,
  comentario text NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nome character varying,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_kanban_comentarios_pkey PRIMARY KEY (id),
  CONSTRAINT rh_kanban_comentarios_cartao_id_fkey1 FOREIGN KEY (cartao_id) REFERENCES public.rh_kanban_cartoes(id),
  CONSTRAINT rh_kanban_comentarios_usuario_id_fkey1 FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_kanban_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartao_id uuid,
  de_coluna character varying,
  para_coluna character varying,
  movido_por uuid,
  movido_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_kanban_historico_pkey PRIMARY KEY (id),
  CONSTRAINT rh_kanban_historico_cartao_id_fkey1 FOREIGN KEY (cartao_id) REFERENCES public.rh_kanban_cartoes(id),
  CONSTRAINT rh_kanban_historico_movido_por_fkey1 FOREIGN KEY (movido_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_notificacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid,
  tipo character varying,
  titulo character varying,
  mensagem text,
  lida boolean DEFAULT false,
  criada_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_notificacoes_pkey PRIMARY KEY (id),
  CONSTRAINT rh_notificacoes_usuario_id_fkey1 FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_painel_metricas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chave character varying NOT NULL UNIQUE,
  valor integer NOT NULL,
  label character varying NOT NULL,
  icone character varying,
  cor character varying,
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_painel_metricas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_plataformas (
  id character varying NOT NULL,
  nome character varying NOT NULL,
  responsavel character varying,
  icone_url text,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_plataformas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_registros_acesso (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  plataforma_id character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pendente'::status_acesso,
  concedido_em timestamp with time zone,
  revogado_em timestamp with time zone,
  concedido_por uuid,
  revogado_por uuid,
  observacoes text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_registros_acesso_pkey PRIMARY KEY (id),
  CONSTRAINT rh_registros_acesso_colaborador_id_fkey1 FOREIGN KEY (colaborador_id) REFERENCES public.rh_colaboradores(id),
  CONSTRAINT rh_registros_acesso_plataforma_id_fkey FOREIGN KEY (plataforma_id) REFERENCES public.rh_plataformas(id),
  CONSTRAINT rh_registros_acesso_concedido_por_fkey FOREIGN KEY (concedido_por) REFERENCES public.profiles(id),
  CONSTRAINT rh_registros_acesso_revogado_por_fkey FOREIGN KEY (revogado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_relatorios_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo character varying NOT NULL UNIQUE,
  nome character varying NOT NULL,
  descricao text,
  query_sql text,
  parametros jsonb,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT rh_relatorios_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_relatorios_config_old (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo character varying NOT NULL UNIQUE,
  nome character varying NOT NULL,
  query_sql text,
  parametros jsonb,
  ativo boolean DEFAULT true,
  CONSTRAINT rh_relatorios_config_old_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rh_relatorios_gerados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_id uuid,
  url_arquivo text,
  formato character varying,
  parametros_usados jsonb,
  gerado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  expira_em timestamp with time zone DEFAULT (now() + '30 days'::interval),
  CONSTRAINT rh_relatorios_gerados_pkey PRIMARY KEY (id),
  CONSTRAINT rh_relatorios_gerados_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.rh_relatorios_config(id),
  CONSTRAINT rh_relatorios_gerados_gerado_por_fkey FOREIGN KEY (gerado_por) REFERENCES public.profiles(id)
);
CREATE TABLE public.rh_relatorios_gerados_old (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_id uuid,
  url_arquivo text,
  formato character varying,
  gerado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  expira_em timestamp with time zone DEFAULT (now() + '30 days'::interval),
  CONSTRAINT rh_relatorios_gerados_old_pkey PRIMARY KEY (id)
);
CREATE TABLE public.scripts_rh (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome text NOT NULL,
  categoria text,
  conteudo text NOT NULL,
  variaveis ARRAY,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scripts_rh_pkey PRIMARY KEY (id)
);
CREATE TABLE public.temp_anexos (
  🔒 Row ID text,
  DATA E HORA text,
  ID text,
  ANEXO text,
  Usuário text
);
CREATE TABLE public.temp_celulares (
  🔒 Row ID text,
  Usuário atual text,
  Nº Matricula text,
  NºCHIP text,
  CELULAR text,
  Modelo text,
  IMEI text,
  ACESSORIOS text,
  DPTO text,
  Status text,
  OBS text,
  Útimo usuário text
);
CREATE TABLE public.temp_colaboradores (
  ID text,
  Nome text,
  Cargo text,
  Departamento text,
  Data Entrada text,
  Etapa id text,
  Foto text
);
CREATE TABLE public.temp_comentarios (
  Usuário id text,
  Colaborador id text,
  Data text,
  Comentário text
);
CREATE TABLE public.temp_departamentos (
  🔒 Row ID text,
  Departamento text
);
CREATE TABLE public.temp_etapas (
  ID text,
  Tipo text,
  Etapa text
);
CREATE TABLE public.temp_linhas (
  🔒 Row ID text,
  NTC text,
  Usuário atual text,
  Empresa text,
  Cód Emp text,
  Centro de custo text,
  Status text,
  Local text,
  OBS text
);
CREATE TABLE public.temp_notebooks (
  🔒 Row ID text,
  Usuário atual text,
  Nº Matricula text,
  Departamento text,
  Marca text,
  Modelo text,
  Status text,
  Motivo text,
  OBS text,
  Último usuário text
);
CREATE TABLE public.temp_plataformas (
  Plataforma text,
  Responsável text,
  Icone text,
  ID text
);
CREATE TABLE public.temp_registros_acesso (
  ID Colaborador text,
  Plataforma text,
  Status Acesso text
);
CREATE TABLE public.temp_registros_celulares (
  🔒 Row ID text,
  ID text,
  DATA E HORA text,
  USUÁRIO text,
  COMENTÁRIO text
);
CREATE TABLE public.temp_registros_linhas (
  🔒 Row ID text,
  ID text,
  DATA E HORA text,
  USUÁRIO text,
  COMENTÁRIO text
);
CREATE TABLE public.temp_registros_notebooks (
  🔒 Row ID text,
  ID text,
  DATA E HORA text,
  USUÁRIO text,
  COMENTÁRIO text
);
CREATE TABLE public.tokens_acesso (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  descricao text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tokens_acesso_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vagas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo text NOT NULL,
  descricao text,
  requisitos text,
  beneficios text,
  salario_min numeric,
  salario_max numeric,
  tipo_contrato text,
  modalidade text,
  local_trabalho text,
  departamento text,
  quantidade_vagas integer DEFAULT 1,
  status text DEFAULT 'aberta'::text,
  prioridade text DEFAULT 'normal'::text,
  data_abertura timestamp with time zone DEFAULT now(),
  data_fechamento timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vagas_pkey PRIMARY KEY (id)
);