-- =============================================================================
-- SISTEMA DE GESTÃO PARA BANDA E ASSESSORIA MUSICAL DE CASAMENTOS (ERP / SaaS)
-- SGBD Alvo: PostgreSQL 15+ (Compatível com extensões UUID e Triggers)
-- Fase 1: Script DDL Completo (Tabelas, Enums, Constraints, Índices e Views)
-- =============================================================================

-- Habilitar extensão para geração de UUIDs (opcional para chaves públicas/tokens)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TIPOS ENUMERADOS (DOMÍNIOS DO SISTEMA)
-- =============================================================================

CREATE TYPE status_musico_enum AS ENUM (
    'ATIVO',
    'INATIVO'
);

CREATE TYPE formacao_musical_enum AS ENUM (
    'VIOLINO_SOLO',
    'DUO',
    'TRIO',
    'QUARTETO',
    'QUINTETO',
    'SEXTETO',
    'ORQUESTRA_CAMARA',
    'BANDA_COMPLETA',
    'PERSONALIZADA'
);

CREATE TYPE status_evento_enum AS ENUM (
    'ORCAMENTO',
    'CONTRATO_ASSINADO',
    'EM_PREPARACAO',
    'REALIZADO',
    'CANCELADO'
);

CREATE TYPE status_confirmacao_escala_enum AS ENUM (
    'PENDENTE',
    'CONFIRMADO',
    'RECUSOU'
);

CREATE TYPE status_pagamento_enum AS ENUM (
    'PENDENTE',
    'PAGO'
);

CREATE TYPE status_parcela_contrato_enum AS ENUM (
    'ABERTO',
    'PAGO',
    'ATRASADO',
    'CANCELADO'
);

CREATE TYPE tipo_parcela_enum AS ENUM (
    'SINAL_ENTRADA',
    'PARCELA_INTERMEDIARIA',
    'QUITACAO_FINAL',
    'ADITIVO_EXTRA'
);

CREATE TYPE forma_pagamento_enum AS ENUM (
    'PIX',
    'TRANSFERENCIA_TED_DOC',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'BOLETO',
    'DINHEIRO'
);

CREATE TYPE momento_cerimonia_enum AS ENUM (
    'RECEPTIVO_CONVIDADOS',
    'ENTRADA_PADRINHOS',
    'ENTRADA_NOIVO',
    'ENTRADA_PAJENS_DAMAS',
    'ANUNCIO_CLARINS',
    'ENTRADA_NOIVA',
    'BENCAO_ALIANCAS',
    'COMUNHAO_HOMENAGENS',
    'ASSINATURA_TERMOS',
    'CUMPRIMENTOS',
    'SAIDA_NOIVOS',
    'POSLUDIO_SAIDA_CONVIDADOS',
    'OUTRO'
);

CREATE TYPE perfil_usuario_enum AS ENUM (
    'ADMIN_GESTOR',
    'COORDENADOR_CERIMONIA',
    'FINANCEIRO',
    'MUSICO_LEITURA'
);

-- =============================================================================
-- 2. FUNÇÃO AUTOMÁTICA DE AUDITORIA (UPDATED_AT)
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. TABELA DE USUÁRIOS (AUTENTICAÇÃO JWT / ACESSO AO SISTEMA)
-- =============================================================================

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil perfil_usuario_enum NOT NULL DEFAULT 'ADMIN_GESTOR',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 4. MÓDULO A: TABELA DE MÚSICOS (FIXOS E FREELANCERS)
-- =============================================================================

CREATE TABLE musicos (
    id BIGSERIAL PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    instrumento_principal VARCHAR(80) NOT NULL,
    instrumentos_secundarios VARCHAR(255),
    telefone_whatsapp VARCHAR(25) NOT NULL,
    email VARCHAR(180),
    chave_pix VARCHAR(180) NOT NULL,
    tipo_chave_pix VARCHAR(30) DEFAULT 'CPF/CNPJ/EMAIL/TELEFONE/ALEATORIA',
    valor_cache_base NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_cache_base >= 0),
    cidade VARCHAR(100) NOT NULL,
    bairro VARCHAR(100),
    status status_musico_enum NOT NULL DEFAULT 'ATIVO',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_musicos_email UNIQUE (email)
);

CREATE INDEX idx_musicos_instrumento_principal ON musicos(instrumento_principal);
CREATE INDEX idx_musicos_status ON musicos(status);
CREATE INDEX idx_musicos_nome_trgm ON musicos(nome_completo);
CREATE INDEX idx_musicos_cidade ON musicos(cidade);

CREATE TRIGGER trg_musicos_updated_at
BEFORE UPDATE ON musicos
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 5. MÓDULO B: TABELA DE CASAMENTOS / EVENTOS (DATAS E CONTRATOS)
-- =============================================================================

CREATE TABLE eventos_casamento (
    id BIGSERIAL PRIMARY KEY,
    codigo_contrato VARCHAR(30) UNIQUE,
    nome_noivos VARCHAR(200) NOT NULL,
    cpf_cnpj_contratante VARCHAR(20) NOT NULL,
    telefone_contato VARCHAR(25) NOT NULL,
    email_contratante VARCHAR(180),
    data_casamento DATE NOT NULL,
    horario_inicio_cerimonia TIME NOT NULL,
    horario_termino_previsto TIME,
    horario_chegada_banda TIME NOT NULL,
    local_cerimonia VARCHAR(200) NOT NULL,
    endereco_completo VARCHAR(255),
    cidade_cerimonia VARCHAR(100) NOT NULL,
    estado_uf CHAR(2) NOT NULL DEFAULT 'SP',
    tipo_formacao formacao_musical_enum NOT NULL,
    descricao_formacao VARCHAR(255),
    status status_evento_enum NOT NULL DEFAULT 'ORCAMENTO',
    link_arquivo_contrato_pdf VARCHAR(500),
    valor_total_bruto NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (valor_total_bruto >= 0),
    observacoes_gerais TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_horarios_validos CHECK (horario_chegada_banda <= horario_inicio_cerimonia)
);

-- Índices otimizados para busca por mês/ano, status e detecção de conflito de agenda
CREATE INDEX idx_eventos_data_casamento ON eventos_casamento(data_casamento);
CREATE INDEX idx_eventos_conflito_agenda ON eventos_casamento(data_casamento, horario_chegada_banda, horario_inicio_cerimonia)
    WHERE status NOT IN ('CANCELADO');
CREATE INDEX idx_eventos_status ON eventos_casamento(status);
CREATE INDEX idx_eventos_tipo_formacao ON eventos_casamento(tipo_formacao);
CREATE INDEX idx_eventos_nome_noivos ON eventos_casamento(nome_noivos);

CREATE TRIGGER trg_eventos_casamento_updated_at
BEFORE UPDATE ON eventos_casamento
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 6. MÓDULO C: ESCALA DE MÚSICOS POR CASAMENTO (RELACIONAMENTO N:N)
-- =============================================================================

CREATE TABLE escalas_musicos (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL,
    musico_id BIGINT NOT NULL,
    instrumento_no_evento VARCHAR(80) NOT NULL,
    valor_cache_combinado NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_cache_combinado >= 0),
    taxa_deslocamento_combustivel NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (taxa_deslocamento_combustivel >= 0),
    status_confirmacao status_confirmacao_escala_enum NOT NULL DEFAULT 'PENDENTE',
    status_pagamento status_pagamento_enum NOT NULL DEFAULT 'PENDENTE',
    data_pagamento DATE,
    comprovante_pagamento_url VARCHAR(500),
    observacoes_escala VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_escala_evento
        FOREIGN KEY (evento_id) REFERENCES eventos_casamento(id) ON DELETE CASCADE,
    CONSTRAINT fk_escala_musico
        FOREIGN KEY (musico_id) REFERENCES musicos(id) ON DELETE RESTRICT,
    -- Impede que o mesmo músico seja escalado em duplicidade no mesmo casamento
    CONSTRAINT uq_evento_musico UNIQUE (evento_id, musico_id),
    -- Garante preenchimento da data quando o status for PAGO
    CONSTRAINT chk_pagamento_data CHECK (
        (status_pagamento = 'PAGO' AND data_pagamento IS NOT NULL) OR
        (status_pagamento = 'PENDENTE')
    )
);

CREATE INDEX idx_escalas_evento_id ON escalas_musicos(evento_id);
CREATE INDEX idx_escalas_musico_id ON escalas_musicos(musico_id);
CREATE INDEX idx_escalas_status_pagamento ON escalas_musicos(status_pagamento);
CREATE INDEX idx_escalas_status_confirmacao ON escalas_musicos(status_confirmacao);

CREATE TRIGGER trg_escalas_musicos_updated_at
BEFORE UPDATE ON escalas_musicos
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 7. MÓDULO D: REPERTÓRIO / MOMENTOS DA CERIMÔNIA (SETLIST)
-- =============================================================================

CREATE TABLE repertorio_cerimonia (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL,
    ordem_execucao SMALLINT NOT NULL CHECK (ordem_execucao > 0),
    momento_cerimonia momento_cerimonia_enum NOT NULL,
    descricao_momento_customizado VARCHAR(120),
    nome_musica VARCHAR(180) NOT NULL,
    artista_versao_referencia VARCHAR(180),
    tom_musica VARCHAR(30),
    andamento_bpm SMALLINT CHECK (andamento_bpm IS NULL OR andamento_bpm > 0),
    link_referencia_midia VARCHAR(500),
    link_partitura_cifra_pdf VARCHAR(500),
    observacoes_arranjo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_repertorio_evento
        FOREIGN KEY (evento_id) REFERENCES eventos_casamento(id) ON DELETE CASCADE,
    CONSTRAINT uq_evento_ordem_execucao UNIQUE (evento_id, ordem_execucao)
);

CREATE INDEX idx_repertorio_evento_ordem ON repertorio_cerimonia(evento_id, ordem_execucao);
CREATE INDEX idx_repertorio_nome_musica ON repertorio_cerimonia(nome_musica);

CREATE TRIGGER trg_repertorio_cerimonia_updated_at
BEFORE UPDATE ON repertorio_cerimonia
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 8. MÓDULO E: SONORIZAÇÃO E LOGÍSTICA (RELACIONAMENTO 1:1 COM EVENTO)
-- =============================================================================

CREATE TABLE sonorizacao_logistica (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL UNIQUE,
    necessita_som_proprio BOOLEAN NOT NULL DEFAULT TRUE,
    lista_equipamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
    descricao_equipamentos_texto TEXT,
    responsavel_tecnico_som VARCHAR(150),
    telefone_responsavel_som VARCHAR(25),
    custo_locacao_tecnico_som NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (custo_locacao_tecnico_som >= 0),
    status_pagamento_som status_pagamento_enum NOT NULL DEFAULT 'PENDENTE',
    data_pagamento_som DATE,
    observacoes_logistica TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sonorizacao_evento
        FOREIGN KEY (evento_id) REFERENCES eventos_casamento(id) ON DELETE CASCADE
);

CREATE INDEX idx_sonorizacao_evento_id ON sonorizacao_logistica(evento_id);

CREATE TRIGGER trg_sonorizacao_logistica_updated_at
BEFORE UPDATE ON sonorizacao_logistica
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 9. MÓDULO F: FINANCEIRO - PARCELAS E RECEBIMENTOS DOS NOIVOS
-- =============================================================================

CREATE TABLE parcelas_contrato (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL,
    numero_parcela SMALLINT NOT NULL CHECK (numero_parcela > 0),
    tipo_parcela tipo_parcela_enum NOT NULL DEFAULT 'PARCELA_INTERMEDIARIA',
    descricao VARCHAR(150) NOT NULL,
    valor_parcela NUMERIC(12, 2) NOT NULL CHECK (valor_parcela > 0),
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    forma_pagamento forma_pagamento_enum NOT NULL DEFAULT 'PIX',
    status status_parcela_contrato_enum NOT NULL DEFAULT 'ABERTO',
    comprovante_url VARCHAR(500),
    observacoes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_parcela_evento
        FOREIGN KEY (evento_id) REFERENCES eventos_casamento(id) ON DELETE CASCADE,
    CONSTRAINT uq_evento_numero_parcela UNIQUE (evento_id, numero_parcela),
    CONSTRAINT chk_parcela_paga_data CHECK (
        (status = 'PAGO' AND data_pagamento IS NOT NULL) OR
        (status IN ('ABERTO', 'ATRASADO', 'CANCELADO'))
    )
);

CREATE INDEX idx_parcelas_evento_id ON parcelas_contrato(evento_id);
CREATE INDEX idx_parcelas_vencimento_status ON parcelas_contrato(data_vencimento, status);
CREATE INDEX idx_parcelas_data_pagamento ON parcelas_contrato(data_pagamento);

CREATE TRIGGER trg_parcelas_contrato_updated_at
BEFORE UPDATE ON parcelas_contrato
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 10. VIEW ANALÍTICA: RESUMO FINANCEIRO AUTOMÁTICO POR CASAMENTO
-- =============================================================================

CREATE OR REPLACE VIEW vw_resumo_financeiro_eventos AS
WITH custos_escala AS (
    SELECT
        evento_id,
        COUNT(id) AS total_musicos_escalados,
        COUNT(id) FILTER (WHERE status_confirmacao = 'CONFIRMADO') AS musicos_confirmados,
        COALESCE(SUM(valor_cache_combinado), 0.00) AS total_caches_musicos,
        COALESCE(SUM(taxa_deslocamento_combustivel), 0.00) AS total_deslocamento_musicos,
        COALESCE(SUM(valor_cache_combinado + taxa_deslocamento_combustivel) FILTER (WHERE status_pagamento = 'PAGO'), 0.00) AS total_pago_musicos,
        COALESCE(SUM(valor_cache_combinado + taxa_deslocamento_combustivel) FILTER (WHERE status_pagamento = 'PENDENTE'), 0.00) AS total_pendente_musicos
    FROM escalas_musicos
    WHERE status_confirmacao <> 'RECUSOU'
    GROUP BY evento_id
),
custos_som AS (
    SELECT
        evento_id,
        COALESCE(custo_locacao_tecnico_som, 0.00) AS custo_som
    FROM sonorizacao_logistica
),
recebimentos_noivos AS (
    SELECT
        evento_id,
        COALESCE(SUM(valor_parcela) FILTER (WHERE status = 'PAGO'), 0.00) AS valor_recebido_noivos,
        COALESCE(SUM(valor_parcela) FILTER (WHERE status IN ('ABERTO', 'ATRASADO')), 0.00) AS valor_a_receber_noivos
    FROM parcelas_contrato
    GROUP BY evento_id
)
SELECT
    e.id AS evento_id,
    e.codigo_contrato,
    e.nome_noivos,
    e.data_casamento,
    e.status AS status_evento,
    e.tipo_formacao,
    e.valor_total_bruto AS receita_bruta,
    COALESCE(r.valor_recebido_noivos, 0.00) AS receita_ja_recebida,
    (e.valor_total_bruto - COALESCE(r.valor_recebido_noivos, 0.00)) AS saldo_a_receber_noivos,
    COALESCE(ce.total_musicos_escalados, 0) AS total_musicos_escalados,
    COALESCE(ce.musicos_confirmados, 0) AS musicos_confirmados,
    COALESCE(ce.total_caches_musicos, 0.00) AS custo_caches,
    COALESCE(ce.total_deslocamento_musicos, 0.00) AS custo_deslocamento,
    COALESCE(cs.custo_som, 0.00) AS custo_sonorizacao,
    (COALESCE(ce.total_caches_musicos, 0.00) + COALESCE(ce.total_deslocamento_musicos, 0.00) + COALESCE(cs.custo_som, 0.00)) AS despesas_totais,
    COALESCE(ce.total_pago_musicos, 0.00) AS total_pago_musicos,
    COALESCE(ce.total_pendente_musicos, 0.00) AS total_pendente_musicos,
    (e.valor_total_bruto - (COALESCE(ce.total_caches_musicos, 0.00) + COALESCE(ce.total_deslocamento_musicos, 0.00) + COALESCE(cs.custo_som, 0.00))) AS lucro_liquido_banda,
    CASE
        WHEN e.valor_total_bruto > 0 THEN
            ROUND(
                ((e.valor_total_bruto - (COALESCE(ce.total_caches_musicos, 0.00) + COALESCE(ce.total_deslocamento_musicos, 0.00) + COALESCE(cs.custo_som, 0.00))) / e.valor_total_bruto) * 100,
                2
            )
        ELSE 0.00
    END AS margem_lucro_percentual
FROM eventos_casamento e
LEFT JOIN custos_escala ce ON ce.evento_id = e.id
LEFT JOIN custos_som cs ON cs.evento_id = e.id
LEFT JOIN recebimentos_noivos r ON r.evento_id = e.id;