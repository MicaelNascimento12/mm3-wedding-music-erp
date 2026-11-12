-- =============================================================================
-- SCRIPT DE SEED (02-seed.sql) - DADOS REALISTAS DE PRODUÇÃO
-- Sistema de Gestão para Banda e Assessoria Musical de Casamentos (MM3 Música)
-- =============================================================================

-- 1. USUÁRIOS DO SISTEMA (Senha padrão: admin123 -> hash bcrypt)
INSERT INTO usuarios (nome_completo, email, senha_hash, perfil, ativo)
VALUES
    ('Micael Maestro & Diretor Musical', 'admin@mm3musica.com.br', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ADMIN_GESTOR', TRUE),
    ('Helena Prado - Cerimonial Musical', 'coord@mm3musica.com.br', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'COORDENADOR_CERIMONIA', TRUE),
    ('Roberto Campos - Gestão Financeira', 'financeiro@mm3musica.com.br', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'FINANCEIRO', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 2. MÚSICOS (FIXOS E FREELANCERS)
INSERT INTO musicos (
    nome_completo, instrumento_principal, instrumentos_secundarios,
    telefone_whatsapp, email, chave_pix, tipo_chave_pix,
    valor_cache_base, cidade, bairro, status, observacoes
) VALUES
    (
        'Gabriel Santoro',
        'Violino',
        'Viola de Arco',
        '5511991234501',
        'gabriel.violino@mm3musica.com.br',
        '345.678.901-11',
        'CPF',
        450.00,
        'São Paulo',
        'Pinheiros',
        'ATIVO',
        'Spalla principal da assessoria. Possui microfone DPA próprio para violino.'
    ),
    (
        'Clara Bittencourt',
        'Teclado',
        'Piano Acústico, Órgão Litúrgico',
        '5511991234502',
        'clara.teclado@mm3musica.com.br',
        'clara.teclado@mm3musica.com.br',
        'EMAIL',
        500.00,
        'São Paulo',
        'Vila Mariana',
        'ATIVO',
        'Tecladista base e arranjadora. Leva Nord Stage 3 e pedal sustain.'
    ),
    (
        'Henrique Villa-Lobos Neto',
        'Violoncelo',
        'Contrabaixo Acústico',
        '5511991234503',
        'henrique.cello@mm3musica.com.br',
        '5511991234503',
        'TELEFONE',
        450.00,
        'São Paulo',
        'Perdizes',
        'ATIVO',
        'Excelente leitura à primeira vista e repertório clássico/pop.'
    ),
    (
        'Lucas Almeida',
        'Clarins',
        'Trompete, Flugelhorn',
        '5511991234504',
        'lucas.clarim@mm3musica.com.br',
        '8f4e2a1b-9c3d-4e5f-a1b2-c3d4e5f60004',
        'ALEATORIA',
        380.00,
        'São Bernardo do Campo',
        'Centro',
        'ATIVO',
        'Primeiro clarim triunfal. Possui clarim dourado heráldico para anúncio da noiva.'
    ),
    (
        'Marcos Vinícius',
        'Clarins',
        'Trompete, Trombone',
        '5511991234505',
        'marcos.clarim@mm3musica.com.br',
        '222.333.444-55',
        'CPF',
        380.00,
        'Santo André',
        'Jardim',
        'ATIVO',
        'Segundo clarim para dobradinha em marchas nupciais.'
    ),
    (
        'Sofia Lorenzi',
        'Voz',
        'Violão Acústico',
        '5511991234506',
        'sofia.voz@mm3musica.com.br',
        'sofia.voz@mm3musica.com.br',
        'EMAIL',
        520.00,
        'São Paulo',
        'Moema',
        'ATIVO',
        'Soprano lírico e pop internacional (Inglês, Italiano e Francês).'
    ),
    (
        'Daniel Ribeiro',
        'Voz',
        'Violão, Guitarra Semi-acústica',
        '5511991234507',
        'daniel.tenor@mm3musica.com.br',
        '5511991234507',
        'TELEFONE',
        480.00,
        'São Paulo',
        'Tatuapé',
        'ATIVO',
        'Tenor / Voz masculina folk & pop. Faz duetos de Andrea Bocelli e Ed Sheeran.'
    ),
    (
        'Thiago Percussa',
        'Percussão',
        'Bateria, Cajón, Carrilhão/Chimes, Tímpanos Digitais',
        '5511991234508',
        'thiago.percussao@mm3musica.com.br',
        '444.555.666-77',
        'CPF',
        400.00,
        'Osasco',
        'Bela Vista',
        'ATIVO',
        'Kit completo de efeito para cerimônia (prato suspenso, carrilhão, bumbo sinfônico).'
    )
ON CONFLICT (email) DO NOTHING;

-- 3. CASAMENTOS / EVENTOS (3 Casamentos Completos)
INSERT INTO eventos_casamento (
    codigo_contrato, nome_noivos, cpf_cnpj_contratante, telefone_contato,
    email_contratante, data_casamento, horario_inicio_cerimonia,
    horario_termino_previsto, horario_chegada_banda, local_cerimonia,
    endereco_completo, cidade_cerimonia, estado_uf, tipo_formacao,
    descricao_formacao, status, link_arquivo_contrato_pdf,
    valor_total_bruto, observacoes_gerais
) VALUES
    (
        'CT-2026-001',
        'Mariana Costa & Rafael Albuquerque',
        '398.412.768-40',
        '5511988776655',
        'mariana.rafael2026@gmail.com',
        '2026-11-07',
        '16:30:00',
        '18:00:00',
        '14:30:00',
        'Paróquia Nossa Senhora do Brasil',
        'Praça Nossa Sra. do Brasil, 01 - Jardim América',
        'São Paulo',
        'SP',
        'SEXTETO',
        'Teclado, Violino, Violoncelo, 2 Clarins Triunfais e Voz Soprano',
        'EM_PREPARACAO',
        'https://drive.google.com/file/d/ct-2026-001-contrato-mariana-rafael/view',
        8500.00,
        'Cerimônia tradicional católica. Noiva faz questão de toque de clarins com portas fechadas antes da Marcha Nupcial de Mendelssohn.'
    ),
    (
        'CT-2026-002',
        'Camila Menezes & Bruno Figueiredo',
        '412.889.301-12',
        '5511977665544',
        'camila.bruno.wedding@outlook.com',
        '2026-11-14',
        '17:00:00',
        '18:45:00',
        '15:00:00',
        'Fazenda Vila Rica',
        'Estrada Municipal dos Romeiros, Km 48 - Zona Rural',
        'Itatiba',
        'SP',
        'ORQUESTRA_CAMARA',
        'Teclado, Violino, Violoncelo, 2 Clarins, Voz Soprano, Voz Tenor e Percussão Sinfônica',
        'CONTRATO_ASSINADO',
        'https://drive.google.com/file/d/ct-2026-002-contrato-camila-bruno/view',
        14200.00,
        'Cerimônia ao ar livre no gramado principal. Necessário tenda ou proteção solar para os instrumentos de cordas (Violino e Violoncelo).'
    ),
    (
        'CT-2026-003',
        'Beatriz Vasconcelos & Lucas Monteiro',
        '287.654.109-88',
        '5511966554433',
        'bia.lucas.casamento@gmail.com',
        '2026-10-24',
        '19:30:00',
        '21:00:00',
        '17:30:00',
        'Espaço Casa Petra',
        'Av. Aratãs, 1010 - Moema',
        'São Paulo',
        'SP',
        'QUARTETO',
        'Teclado, Violino, Violoncelo e Voz Soprano',
        'REALIZADO',
        'https://drive.google.com/file/d/ct-2026-003-contrato-beatriz-lucas/view',
        5800.00,
        'Evento realizado com sucesso absoluto. Noivos elogiaram muito o arranjo de Clair de Lune + La Vie En Rose.'
    )
ON CONFLICT (codigo_contrato) DO NOTHING;

-- 4. ESCALAS DE MÚSICOS POR CASAMENTO
-- Casamento 1 (ID 1 - Sexteto: Violino, Teclado, Violoncelo, 2 Clarins, Voz Soprano)
INSERT INTO escalas_musicos (
    evento_id, musico_id, instrumento_no_evento, valor_cache_combinado,
    taxa_deslocamento_combustivel, status_confirmacao, status_pagamento,
    data_pagamento, observacoes_escala
) VALUES
    (1, 1, 'Violino', 450.00, 50.00, 'CONFIRMADO', 'PAGO', '2026-11-01', 'Adiantamento 100% quitado via PIX'),
    (1, 2, 'Teclado', 500.00, 60.00, 'CONFIRMADO', 'PAGO', '2026-11-01', 'Levará Nord Stage + suporte X duplo'),
    (1, 3, 'Violoncelo', 450.00, 50.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Pagamento agendado para segunda-feira pós-evento'),
    (1, 4, 'Clarins (1º Voz)', 380.00, 40.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Traje fraque completo escuro'),
    (1, 5, 'Clarins (2º Voz)', 380.00, 40.00, 'PENDENTE', 'PENDENTE', NULL, 'Aguardando confirmação final do horário de passagem'),
    (1, 6, 'Voz Soprano', 520.00, 50.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Solos em Ave Maria de Gounod e O Mio Babbino Caro'),

-- Casamento 2 (ID 2 - Orquestra de Câmara em Itatiba: 8 músicos)
    (2, 1, 'Violino Spalla', 500.00, 120.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Deslocamento SP -> Itatiba (pedágio + combustível)'),
    (2, 2, 'Teclado / Piano', 550.00, 120.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Vai no carro da equipe técnica'),
    (2, 3, 'Violoncelo', 500.00, 100.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Carona compartilhada com Gabriel'),
    (2, 4, 'Clarins (1º)', 400.00, 90.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Posicionar no mezanino do jardim'),
    (2, 5, 'Clarins (2º)', 400.00, 90.00, 'PENDENTE', 'PENDENTE', NULL, 'Confirmar até sexta-feira'),
    (2, 6, 'Voz Soprano', 550.00, 100.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Duetos com Daniel Ribeiro'),
    (2, 7, 'Voz Tenor & Violão', 500.00, 100.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Levar violão Taylor para entrada do noivo'),
    (2, 8, 'Percussão Sinfônica', 450.00, 130.00, 'CONFIRMADO', 'PENDENTE', NULL, 'Levar carrilhão, prato suspenso e surdo sinfônico'),

-- Casamento 3 (ID 3 - Quarteto Realizado: todos pagos)
    (3, 1, 'Violino', 450.00, 40.00, 'CONFIRMADO', 'PAGO', '2026-10-26', 'Pago via PIX'),
    (3, 2, 'Teclado', 500.00, 50.00, 'CONFIRMADO', 'PAGO', '2026-10-26', 'Pago via PIX'),
    (3, 3, 'Violoncelo', 450.00, 40.00, 'CONFIRMADO', 'PAGO', '2026-10-26', 'Pago via PIX'),
    (3, 6, 'Voz Soprano', 520.00, 40.00, 'CONFIRMADO', 'PAGO', '2026-10-26', 'Pago via PIX')
ON CONFLICT (evento_id, musico_id) DO NOTHING;

-- 5. REPERTÓRIO DA CERIMÔNIA (MÓDULO D)
INSERT INTO repertorio_cerimonia (
    evento_id, ordem_execucao, momento_cerimonia, descricao_momento_customizado,
    nome_musica, artista_versao_referencia, tom_musica, andamento_bpm,
    link_referencia_midia, link_partitura_cifra_pdf, observacoes_arranjo
) VALUES
    -- Casamento 1
    (1, 1, 'RECEPTIVO_CONVIDADOS', NULL, 'Canon in D', 'Johann Pachelbel (Brooklyn Duo)', 'D Maior', 68, 'https://www.youtube.com/watch?v=Ptk_1Dc2iPY', 'https://drive.google.com/file/d/partitura-canon-in-d/view', 'Instrumental suave com Violino, Cello e Teclado.'),
    (1, 2, 'ENTRADA_PADRINHOS', NULL, 'Somewhere Over The Rainbow', 'Israel Kamakawiwo''ole (Arranjo Cordas)', 'C Maior', 82, 'https://www.youtube.com/watch?v=V1bFr2SWP1I', 'https://drive.google.com/file/d/partitura-over-the-rainbow/view', 'Entrada de 8 casais de padrinhos. Manter loop no refrão até o último casal.'),
    (1, 3, 'ENTRADA_NOIVO', NULL, 'Viva La Vida', 'Coldplay (2Cellos & Strings Version)', 'Ab Maior', 138, 'https://www.youtube.com/watch?v=dvgZkm1xWPE', 'https://drive.google.com/file/d/partitura-viva-la-vida/view', 'Entrada firme no ataque das cordas em staccato.'),
    (1, 4, 'ENTRADA_PAJENS_DAMAS', NULL, 'A Thousand Years', 'Christina Perri (The Piano Guys)', 'Bb Maior', 75, 'https://www.youtube.com/watch?v=QgaTQ5-XfMM', 'https://drive.google.com/file/d/partitura-a-thousand-years/view', 'Apenas instrumental doce; pajem leva placa lá vem a noiva.'),
    (1, 5, 'ANUNCIO_CLARINS', NULL, 'Clarins de Roma + Marcha Nupcial', 'Felix Mendelssohn', 'C Maior', 100, 'https://www.youtube.com/watch?v=l7_m1om8tnE', 'https://drive.google.com/file/d/partitura-clarins-mendelssohn/view', 'Clarins abrem com portas fechadas; abertura da porta no compasso 9.'),
    (1, 6, 'ENTRADA_NOIVA', NULL, 'Marcha Nupcial + Ave Maria (Medley)', 'Mendelssohn / Charles Gounod', 'F Maior', 72, 'https://www.youtube.com/watch?v=px0j1EPvK70', 'https://drive.google.com/file/d/partitura-marcha-ave-maria/view', 'Transição para Soprano solo quando a noiva chega na metade da nave.'),
    (1, 7, 'BENCAO_ALIANCAS', NULL, 'Ave Maria', 'Franz Schubert (Voz Soprano & Cordas)', 'Bb Maior', 64, 'https://www.youtube.com/watch?v=2bosouX_d8Y', 'https://drive.google.com/file/d/partitura-schubert-ave-maria/view', 'Cantar 1ª estrofe em Latim após o sacerdote abençoar as alianças.'),
    (1, 8, 'SAIDA_NOIVOS', NULL, 'Signed, Sealed, Delivered (I''m Yours)', 'Stevie Wonder', 'F Maior', 108, 'https://www.youtube.com/watch?v=6To0fvX_wFA', 'https://drive.google.com/file/d/partitura-signed-sealed/view', 'Ataque nos metais e voz logo após o beijo dos noivos!'),

    -- Casamento 2
    (2, 1, 'RECEPTIVO_CONVIDADOS', NULL, 'Clair de Lune & Bridgerton Theme Medley', 'Claude Debussy / Kris Bowers', 'Db Maior', 66, 'https://www.youtube.com/watch?v=CvFH_6DNRCY', 'https://drive.google.com/file/d/partitura-clair-de-lune/view', 'Setlist de 30 minutos de receptivo no jardim.'),
    (2, 2, 'ENTRADA_NOIVO', NULL, 'Con Te Partirò (Time To Say Goodbye)', 'Andrea Bocelli (Tenor Solo)', 'G Maior', 70, 'https://www.youtube.com/watch?v=4L_yCwFD6Jo', 'https://drive.google.com/file/d/partitura-con-te-partiro/view', 'Entrada emocionante do noivo com sua mãe.'),
    (2, 3, 'ENTRADA_PADRINHOS', NULL, 'Perfect Symphony', 'Ed Sheeran & Andrea Bocelli', 'Ab Maior', 95, 'https://www.youtube.com/watch?v=eiDiKwbGfIY', 'https://drive.google.com/file/d/partitura-perfect-symphony/view', 'Dueto Soprano e Tenor com percussão crescendo.'),
    (2, 4, 'ANUNCIO_CLARINS', NULL, 'Fanfarra Real da Rainha + Clarins Triunfais', 'Arranjo MM3 Música', 'D Maior', 98, 'https://www.youtube.com/watch?v=l7_m1om8tnE', 'https://drive.google.com/file/d/partitura-fanfarra-real/view', '2 Clarins + Rulo de Tímpano/Prato suspenso.'),
    (2, 5, 'ENTRADA_NOIVA', NULL, 'La Vie En Rose (Intro) + Marcha Nupcial Sinfônica', 'Édith Piaf / Mendelssohn', 'C Maior', 80, 'https://www.youtube.com/watch?v=rzeLynj1GYM', 'https://drive.google.com/file/d/partitura-la-vie-marcha/view', 'Violino solo abre em rubato antes da entrada triunfal da orquestra.'),
    (2, 6, 'BENCAO_ALIANCAS', NULL, 'The Prayer', 'Celine Dion & Andrea Bocelli', 'F Maior', 68, 'https://www.youtube.com/watch?v=qt_OkgSOrkU', 'https://drive.google.com/file/d/partitura-the-prayer/view', 'Dueto principal da cerimônia.'),
    (2, 7, 'SAIDA_NOIVOS', NULL, 'This Will Be (An Everlasting Love)', 'Natalie Cole', 'Eb Maior', 124, 'https://www.youtube.com/watch?v=StandardLink', 'https://drive.google.com/file/d/partitura-this-will-be/view', 'Saída com chuva de pétalas e fogos indoor.'),

    -- Casamento 3
    (3, 1, 'ENTRADA_PADRINHOS', NULL, 'Yellow (Strings Version)', 'Coldplay (Vitamin String Quartet)', 'B Maior', 86, 'https://www.youtube.com/watch?v=yKNxeF4KMsY', 'https://drive.google.com/file/d/partitura-yellow/view', 'Quarteto instrumental.'),
    (3, 2, 'ENTRADA_NOIVO', NULL, 'Hallelujah', 'Leonard Cohen', 'C Maior', 60, 'https://www.youtube.com/watch?v=YrLk4vdY28Q', 'https://drive.google.com/file/d/partitura-hallelujah/view', 'Violoncelo inicia o tema grave.'),
    (3, 3, 'ENTRADA_NOIVA', NULL, 'Clair de Lune + La Vie En Rose', 'Debussy / Piaf', 'D Maior', 72, 'https://www.youtube.com/watch?v=CvFH_6DNRCY', 'https://drive.google.com/file/d/partitura-clair-lavie/view', 'Arranjo exclusivo sob encomenda.'),
    (3, 4, 'SAIDA_NOIVOS', NULL, 'Viva La Vida', 'Coldplay', 'Ab Maior', 138, 'https://www.youtube.com/watch?v=dvgZkm1xWPE', 'https://drive.google.com/file/d/partitura-viva-la-vida/view', 'Finalização vibrante.')
ON CONFLICT (evento_id, ordem_execucao) DO NOTHING;

-- 6. SONORIZAÇÃO E LOGÍSTICA (MÓDULO E - 1:1)
INSERT INTO sonorizacao_logistica (
    evento_id, necessita_som_proprio, lista_equipamentos,
    descricao_equipamentos_texto, responsavel_tecnico_som,
    telefone_responsavel_som, custo_locacao_tecnico_som,
    status_pagamento_som, data_pagamento_som, observacoes_logistica
) VALUES
    (
        1,
        TRUE,
        '[
            {"item": "Caixas Ativas QSC K12.2 + Pedestais", "quantidade": 2, "conferido": true},
            {"item": "Mesa Digital Behringer XR18 + iPad", "quantidade": 1, "conferido": true},
            {"item": "Microfone Sem Fio Shure SLXD (Voz + Celebrante)", "quantidade": 2, "conferido": true},
            {"item": "Microfone Clip DPA 4099 (Violino e Cello)", "quantidade": 2, "conferido": true},
            {"item": "Direct Box Passivo Stereo (Teclado Nord)", "quantidade": 1, "conferido": true},
            {"item": "Estantes de Partitura Pretas c/ Luz LED", "quantidade": 6, "conferido": false}
        ]'::jsonb,
        'Sistema PA completo para igreja de médio porte + monitoração in-ear para soprano e teclado.',
        'Rodrigo Áudio Pro',
        '5511988112233',
        650.00,
        'PENDENTE',
        NULL,
        'Igreja exige passagem de cabos com fita gaffer preta fosca. Ponto de energia 220V próximo à sacristia.'
    ),
    (
        2,
        TRUE,
        '[
            {"item": "Sistema Coluna Bose L1 Pro16 (Cerimônia Campo)", "quantidade": 2, "conferido": true},
            {"item": "Mesa Digital Midas MR18", "quantidade": 1, "conferido": true},
            {"item": "Microfones Sem Fio Sennheiser EW-D", "quantidade": 3, "conferido": false},
            {"item": "Microfones Condensadores Over Percussão", "quantidade": 2, "conferido": false},
            {"item": "Gerador Estabilizado / Nobreak Senoidal 3kVA", "quantidade": 1, "conferido": true},
            {"item": "Tenda Branca 4x4m Proteção Solar Orquestra", "quantidade": 1, "conferido": false}
        ]'::jsonb,
        'Sonorização reforçada para cerimônia ao ar livre para 280 convidados na Fazenda Vila Rica.',
        'Rodrigo Áudio Pro',
        '5511988112233',
        1100.00,
        'PENDENTE',
        NULL,
        'Confirmar liberação de acesso da van de equipamentos na portaria de serviço da fazenda às 14h00.'
    ),
    (
        3,
        FALSE,
        '[
            {"item": "Direct Box Próprio p/ Teclado", "quantidade": 1, "conferido": true},
            {"item": "Receptor In-Ear Pessoal Músicos", "quantidade": 4, "conferido": true}
        ]'::jsonb,
        'Som da casa (Casa Petra) utilizado com técnico local. Levamos apenas Direct Box e In-Ears.',
        'Equipe Interna Casa Petra',
        '5511955443322',
        250.00,
        'PAGO',
        '2026-10-25',
        'Alinhamento com o técnico da casa feito às 18h00 sem intercorrências.'
    )
ON CONFLICT (evento_id) DO NOTHING;

-- 7. PARCELAS DO CONTRATO - FINANCEIRO DOS NOIVOS (MÓDULO F)
INSERT INTO parcelas_contrato (
    evento_id, numero_parcela, tipo_parcela, descricao, valor_parcela,
    data_vencimento, data_pagamento, forma_pagamento, status,
    comprovante_url, observacoes
) VALUES
    -- Casamento 1 (Total: R$ 8.500,00)
    (1, 1, 'SINAL_ENTRADA', 'Sinal de Reserva de Data (30%)', 2550.00, '2026-06-10', '2026-06-09', 'PIX', 'PAGO', 'https://drive.google.com/file/d/comp-c1-p1/view', 'Recebido na assinatura do contrato'),
    (1, 2, 'PARCELA_INTERMEDIARIA', '2ª Parcela Intermediária (30%)', 2550.00, '2026-09-10', '2026-09-10', 'PIX', 'PAGO', 'https://drive.google.com/file/d/comp-c1-p2/view', 'Pago em dia'),
    (1, 3, 'QUITACAO_FINAL', 'Quitação Final (40% - até 5 dias antes do evento)', 3400.00, '2026-11-05', NULL, 'PIX', 'ABERTO', NULL, 'Vencimento na semana do casamento'),

    -- Casamento 2 (Total: R$ 14.200,00)
    (2, 1, 'SINAL_ENTRADA', 'Sinal de Assinatura do Contrato (30%)', 4260.00, '2026-07-15', '2026-07-15', 'TRANSFERENCIA_TED_DOC', 'PAGO', 'https://drive.google.com/file/d/comp-c2-p1/view', 'TED confirmada no banco'),
    (2, 2, 'PARCELA_INTERMEDIARIA', '2ª Parcela Mensal', 3300.00, '2026-09-15', '2026-09-14', 'PIX', 'PAGO', 'https://drive.google.com/file/d/comp-c2-p2/view', 'Pago via PIX CNPJ'),
    (2, 3, 'PARCELA_INTERMEDIARIA', '3ª Parcela Mensal', 3300.00, '2026-10-25', NULL, 'BOLETO', 'ATRASADO', NULL, 'Noivo solicitou reemissão por PIX para esta semana'),
    (2, 4, 'QUITACAO_FINAL', 'Quitação Final Cerimônia (Saldo)', 3340.00, '2026-11-10', NULL, 'PIX', 'ABERTO', NULL, 'Quitação até 4 dias antes do casamento'),

    -- Casamento 3 (Total: R$ 5.800,00 - 100% Quitado)
    (3, 1, 'SINAL_ENTRADA', 'Sinal de Reserva (50%)', 2900.00, '2026-08-01', '2026-08-01', 'PIX', 'PAGO', 'https://drive.google.com/file/d/comp-c3-p1/view', 'Quitado na assinatura'),
    (3, 2, 'QUITACAO_FINAL', 'Quitação Final (50%)', 2900.00, '2026-10-15', '2026-10-14', 'PIX', 'PAGO', 'https://drive.google.com/file/d/comp-c3-p2/view', 'Contrato 100% liquidado')
ON CONFLICT (evento_id, numero_parcela) DO NOTHING;
