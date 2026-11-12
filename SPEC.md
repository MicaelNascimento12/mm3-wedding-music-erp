# Especificação Mestra (PRD & Guia de Agente) — Sistema ERP para Banda e Assessoria Musical de Casamentos

> **Instrução para o Agente do Google Antigravity:**
> Você é um Engenheiro de Software Sênior e Arquiteto Full-Stack. Seu objetivo é construir e executar localmente o código completo, funcional e sem placeholders (`// TODO` ou `// implemente aqui`) de um **Sistema de Gestão para Banda e Assessoria Musical de Casamentos**.
> O arquivo `schema_banco_dados.sql` na raiz do projeto já contém a modelagem relacional oficial (PostgreSQL 15+). Utilize este documento como sua especificação mestre e construa o projeto de ponta a ponta no meu workspace local.

---

## 1. Stack Tecnológica e Padrões de Arquitetura
- **Banco de Dados:** PostgreSQL 15+ (via `docker-compose.yml` na raiz) consumindo o arquivo `schema_banco_dados.sql`.
- **Back-end (`/backend`):** Python 3.11+, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2 (validação e serialização), Alembic, PyJWT + Passlib/Bcrypt para autenticação JWT.
- **Front-end (`/frontend`):** React 18 + Vite + TypeScript, Tailwind CSS, Lucide Icons, componentes estilo Shadcn/UI, React Router DOM v6 e Axios.
- **Arquitetura Back-end:** Separação estrita em camadas (`models`, `schemas`, `repositories`, `services`, `api/v1/endpoints`).

---

## 2. Regras de Negócio e Módulos Obrigatórios

### Módulo A: Músicos (`musicos`)
- **Campos:** `id`, `nome_completo`, `instrumento_principal` (Violino, Teclado, Violoncelo, Clarins, Voz, Percussão, etc.), `instrumentos_secundarios`, `telefone_whatsapp`, `email`, `chave_pix`, `tipo_chave_pix`, `valor_cache_base`, `cidade`, `bairro`, `status` (`ATIVO` | `INATIVO`), `observacoes`.
- **Funcionalidades:**
  - CRUD completo e filtro rápido por instrumento e status.
  - Endpoint `GET /api/v1/musicos/{id}/historico-financeiro`: retorna todos os casamentos em que o músico foi escalado, total de cachês já pagos e saldo total pendente a receber.

### Módulo B: Casamentos / Eventos (`eventos_casamento`)
- **Campos:** `id`, `codigo_contrato`, `nome_noivos`, `cpf_cnpj_contratante`, `telefone_contato`, `email_contratante`, `data_casamento`, `horario_inicio_cerimonia`, `horario_termino_previsto`, `horario_chegada_banda` (passagem de som), `local_cerimonia`, `endereco_completo`, `cidade_cerimonia`, `estado_uf`, `tipo_formacao` (`VIOLINO_SOLO`, `DUO`, `TRIO`, `QUARTETO`, `QUINTETO`, `SEXTETO`, `ORQUESTRA_CAMARA`, `BANDA_COMPLETA`, `PERSONALIZADA`), `status` (`ORCAMENTO`, `CONTRATO_ASSINADO`, `EM_PREPARACAO`, `REALIZADO`, `CANCELADO`), `link_arquivo_contrato_pdf`, `valor_total_bruto`, `observacoes_gerais`.
- **Regra Crítica de Conflito de Agenda:**
  - Ao criar ou atualizar um casamento (ou via endpoint dedicado `GET /api/v1/eventos/verificar-conflito`), verificar se já existe outro evento não cancelado na mesma `data_casamento` cuja janela entre `horario_chegada_banda` e `horario_termino_previsto` (ou `horario_inicio_cerimonia + 2h` caso término não informado) tenha sobreposição ou margem inferior a 90 minutos. Retornar alerta estruturado detalhando o(s) evento(s) conflitante(s).

### Módulo C: Escala de Músicos por Casamento (`escalas_musicos` — N:N)
- **Campos:** `id`, `evento_id`, `musico_id`, `instrumento_no_evento`, `valor_cache_combinado` (pré-preenchido com `valor_cache_base` do músico, mas editável por evento), `taxa_deslocamento_combustivel`, `status_confirmacao` (`PENDENTE`, `CONFIRMADO`, `RECUSOU`), `status_pagamento` (`PENDENTE`, `PAGO`), `data_pagamento`, `observacoes_escala`.
- **Funcionalidades:**
  - Vincular/remover músicos do casamento, atualizar confirmação de presença e registrar baixa rápida de pagamento do cachê (preenchendo automaticamente `data_pagamento = hoje` ao marcar como `PAGO`).
  - Alerta se o músico escalado já estiver escalado em outro casamento no mesmo dia/horário.

### Módulo D: Repertório / Momentos da Cerimônia (`repertorio_cerimonia`)
- **Campos:** `id`, `evento_id`, `ordem_execucao`, `momento_cerimonia` (`RECEPTIVO_CONVIDADOS`, `ENTRADA_PADRINHOS`, `ENTRADA_NOIVO`, `ENTRADA_PAJENS_DAMAS`, `ANUNCIO_CLARINS`, `ENTRADA_NOIVA`, `BENCAO_ALIANCAS`, `COMUNHAO_HOMENAGENS`, `ASSINATURA_TERMOS`, `CUMPRIMENTOS`, `SAIDA_NOIVOS`, `POSLUDIO_SAIDA_CONVIDADOS`, `OUTRO`), `descricao_momento_customizado`, `nome_musica`, `artista_versao_referencia`, `tom_musica`, `andamento_bpm`, `link_referencia_midia` (YouTube/Spotify), `link_partitura_cifra_pdf`, `observacoes_arranjo`.
- **Funcionalidades:** CRUD completo por evento e endpoint de reordenação (`PUT /api/v1/eventos/{evento_id}/repertorio/reordenar`).

### Módulo E: Sonorização e Logística (`sonorizacao_logistica` — 1:1)
- **Campos:** `id`, `evento_id`, `necessita_som_proprio` (bool), `lista_equipamentos` (JSONB array de objetos `{item, quantidade, conferido}`), `descricao_equipamentos_texto`, `responsavel_tecnico_som`, `telefone_responsavel_som`, `custo_locacao_tecnico_som`, `status_pagamento_som`, `data_pagamento_som`, `observacoes_logistica`.

### Módulo F: Financeiro (`parcelas_contrato` + Cálculos de DRE do Evento)
- **Parcelas dos Noivos:** Controle de Sinal (Entrada) + Parcelas Intermediárias + Quitação Final (`numero_parcela`, `tipo_parcela`, `descricao`, `valor_parcela`, `data_vencimento`, `data_pagamento`, `forma_pagamento`, `status`).
- **Cálculo Automático por Casamento (retornado no Schema de Detalhes e Financeiro):**
  - `receita_bruta` = `valor_total_bruto` do contrato
  - `receita_ja_recebida` = soma das parcelas com `status = 'PAGO'`
  - `saldo_a_receber_noivos` = `receita_bruta - receita_ja_recebida`
  - `custo_caches` = soma de `valor_cache_combinado` dos músicos escalados (exceto `RECUSOU`)
  - `custo_deslocamento` = soma de `taxa_deslocamento_combustivel` dos músicos escalados (exceto `RECUSOU`)
  - `custo_sonorizacao` = `custo_locacao_tecnico_som`
  - `despesas_totais` = `custo_caches + custo_deslocamento + custo_sonorizacao`
  - `lucro_liquido_banda` = `receita_bruta - despesas_totais`
  - `margem_lucro_percentual` = `((lucro_liquido_banda / receita_bruta) * 100)`

---

## 3. Telas e Interfaces do Front-end (React + TypeScript + Tailwind)
1. **Dashboard Principal (`/dashboard`):**
   - Cards executivos: Faturamento do Mês, Lucro Líquido Previsto, Total de Casamentos no Ano, Cachês Pendentes de Pagamento.
   - Lista de "Próximos Casamentos da Semana" e alertas de parcelas ou cachês vencendo.
2. **Tabela Geral de Casamentos e Calendário (`/casamentos`):**
   - Alternância entre **Visão em Tabela** (com filtros por mês/ano, status e tipo de formação) e **Visão em Calendário Mensal**.
   - Modal de Novo Casamento com validação em tempo real de conflito de horário.
3. **Página de Detalhes do Casamento — Visão 360º (`/casamentos/:id`):**
   - Cabeçalho com resumo do casal, status, data/horário, formação e cards de Receita, Despesa, Lucro Líquido e Margem (%).
   - Sistema de Abas (`Tabs`):
     1. *Dados & Contrato* (edição cadastral e link para PDF do contrato)
     2. *Escala de Músicos* (escalar músico, definir cachê/deslocamento, status de confirmação e botão de dar baixa no pagamento)
     3. *Repertório da Cerimônia* (tabela ordenada por momento da cerimônia, tom da música, botões para abrir YouTube/Spotify e PDF da partitura)
     4. *Equipamentos de Som* (toggle de som próprio, checklist interativo de equipamentos, técnico responsável e custo)
     5. *Resumo Financeiro do Evento* (gestão das parcelas dos noivos vs. resumo de pagamentos da equipe)
4. **Tabela de Músicos (`/musicos`):**
   - Listagem com busca por nome e filtro rápido por instrumento principal.
   - Botão de ação rápida para abrir conversa no **WhatsApp** (`https://wa.me/...`) e botão **Copiar Chave PIX** com feedback visual (toast).

---

## 4. Plano de Execução Passo a Passo no Antigravity

Execute as etapas abaixo em sequência, validando cada uma no terminal antes de passar para a próxima:

1. **Etapa 1 (Infra & Banco):** Crie o `docker-compose.yml` na raiz com PostgreSQL 15 montando `./schema_banco_dados.sql` em `/docker-entrypoint-initdb.d/01-schema.sql` e crie um script de seed (`02-seed.sql` ou `seed.py`) com dados realistas de músicos (violino, teclado, violoncelo, clarins, voz) e 3 casamentos completos.
2. **Etapa 2 (Back-end Core):** Implemente `backend/requirements.txt`, `app/core/config.py`, `app/core/database.py`, `app/core/security.py`, `app/models/models.py` e `app/schemas/schemas.py`.
3. **Etapa 3 (Back-end Repositories, Services & Routers):** Implemente todas as rotas FastAPI em `app/api/v1/endpoints/`, incluindo a regra de conflito de agenda e os cálculos de DRE por casamento, e configure o `app/main.py` com CORS liberado para o front-end.
4. **Etapa 4 (Front-end Base, Dashboard e Listagens):** Crie o projeto Vite + React + TS em `/frontend`, configure o Tailwind CSS, os serviços Axios e implemente o Dashboard, a Tabela/Calendário de Casamentos e a Tabela de Músicos (com botões de WhatsApp e cópia de PIX).
5. **Etapa 5 (Front-end Visão 360º do Casamento):** Implemente a página `/casamentos/:id` com as 5 abas completas e funcionais.
6. **Etapa 6 (Execução e Testes):** Suba o banco, inicie o servidor Uvicorn e o servidor Vite, e verifique no navegador integrado se todas as rotas e telas estão operando sem erros.
