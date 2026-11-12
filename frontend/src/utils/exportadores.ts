import {
  EscalaMusico,
  EventoCasamento,
  EventoCasamento360,
} from '../types';
import {
  FORMA_PAGAMENTO_LABELS,
  FORMACAO_LABELS,
  MOMENTO_CERIMONIA_LABELS,
  STATUS_CONFIRMACAO_LABELS,
  STATUS_EVENTO_LABELS,
  STATUS_PARCELA_LABELS,
  TIPO_PARCELA_LABELS,
  formatCurrency,
  formatDateBR,
  formatTimeShort,
} from './formatters';

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/\r?\n/g, ' ').trim();
  if (str.includes(';') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDecimalBR(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return '0,00';
  return num.toFixed(2).replace('.', ',');
}

function triggerDownloadCsv(filename: string, rows: string[][]): void {
  const csvBody = rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
  // BOM UTF-8 (\uFEFF) garante que o Microsoft Excel em Português abra acentos e colunas (;) automaticamente
  const blob = new Blob(['\uFEFF' + csvBody], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 3. EXPORTAÇÃO FINANCEIRA PARA EXCEL (.CSV COMPATÍVEL COM EXCEL PT-BR)
 * Exporta todos os casamentos filtrados + resumo mensal + total geral
 */
export function exportarFinanceiroCasamentosCSV(
  eventos: EventoCasamento[],
  tituloPeriodo = 'Geral'
): void {
  const ordenados = [...eventos].sort((a, b) =>
    a.data_casamento.localeCompare(b.data_casamento)
  );

  const rows: string[][] = [];

  rows.push([
    `RELATÓRIO FINANCEIRO E DRE DE CASAMENTOS — MM3 MÚSICA (${tituloPeriodo.toUpperCase()})`,
  ]);
  rows.push([
    `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
  ]);
  rows.push([]);

  // Cabeçalho principal
  rows.push([
    'Código',
    'Mês/Ano',
    'Data da Cerimônia',
    'Horário Chegada',
    'Horário Início Cerimônia',
    'Modalidade',
    'Banda Contratante (Freelancer)',
    'Noivos / Evento',
    'Local da Cerimônia',
    'Cidade/UF',
    'Formação Musical',
    'Status do Evento',
    'Faturamento Bruto / Meu Cachê (R$)',
    'Valor Já Recebido (R$)',
    'Saldo a Receber (R$)',
    'Gasto Cachês Músicos (R$)',
    'Gasto Deslocamento (R$)',
    'Gasto Sonorização (R$)',
    'Despesa Total (R$)',
    'Cachês Pagos (R$)',
    'Cachês Pendentes (R$)',
    'Lucro Líquido (R$)',
    'Margem Líquida (%)',
  ]);

  let totalBruto = 0;
  let totalRecebido = 0;
  let totalAReceber = 0;
  let totalGastoCaches = 0;
  let totalGastoDesloc = 0;
  let totalGastoSom = 0;
  let totalDespesas = 0;
  let totalPagoMusicos = 0;
  let totalPendenteMusicos = 0;
  let totalLucro = 0;

  const resumoPorMes = new Map<
    string,
    {
      label: string;
      qtd: number;
      proprios: number;
      freelancers: number;
      bruto: number;
      despesas: number;
      lucro: number;
      recebido: number;
      aReceber: number;
    }
  >();

  for (const ev of ordenados) {
    const [anoStr, mesStr] = ev.data_casamento.split('-');
    const mesIdx = Math.max(0, Math.min(11, Number(mesStr) - 1));
    const chaveMes = `${anoStr}-${mesStr}`;
    const labelMes = `${MESES_NOMES[mesIdx]}/${anoStr}`;

    const isFreelancer = ev.tipo_contratacao === 'FREELANCER_CACHE';
    const bruto = Number(ev.valor_total_bruto || 0);
    const dre = ev.resumo_financeiro;

    const recebido = Number(dre?.receita_ja_recebida ?? 0);
    const aReceber = Number(dre?.saldo_a_receber_noivos ?? bruto);
    const gastoCaches = Number(dre?.custo_caches ?? 0);
    const gastoDesloc = Number(dre?.custo_deslocamento ?? 0);
    const gastoSom = Number(dre?.custo_sonorizacao ?? 0);
    const despesas = Number(dre?.despesas_totais ?? 0);
    const pagoMusicos = Number(dre?.total_pago_musicos ?? 0);
    const pendenteMusicos = Number(dre?.total_pendente_musicos ?? 0);
    const lucro = Number(dre?.lucro_liquido_banda ?? bruto);
    const margem = Number(dre?.margem_lucro_percentual ?? (bruto > 0 ? 100 : 0));

    if (ev.status !== 'CANCELADO') {
      totalBruto += bruto;
      totalRecebido += recebido;
      totalAReceber += aReceber;
      totalGastoCaches += gastoCaches;
      totalGastoDesloc += gastoDesloc;
      totalGastoSom += gastoSom;
      totalDespesas += despesas;
      totalPagoMusicos += pagoMusicos;
      totalPendenteMusicos += pendenteMusicos;
      totalLucro += lucro;

      const atualMes = resumoPorMes.get(chaveMes) || {
        label: labelMes,
        qtd: 0,
        proprios: 0,
        freelancers: 0,
        bruto: 0,
        despesas: 0,
        lucro: 0,
        recebido: 0,
        aReceber: 0,
      };
      atualMes.qtd += 1;
      if (isFreelancer) atualMes.freelancers += 1;
      else atualMes.proprios += 1;
      atualMes.bruto += bruto;
      atualMes.despesas += despesas;
      atualMes.lucro += lucro;
      atualMes.recebido += recebido;
      atualMes.aReceber += aReceber;
      resumoPorMes.set(chaveMes, atualMes);
    }

    rows.push([
      ev.codigo_contrato || `#${ev.id}`,
      labelMes,
      formatDateBR(ev.data_casamento),
      formatTimeShort(ev.horario_chegada_banda),
      formatTimeShort(ev.horario_inicio_cerimonia),
      isFreelancer ? 'Cachê Freelancer (Outra Banda)' : 'Meu Contrato Próprio (Noivos)',
      ev.nome_banda_contratante || '—',
      ev.nome_noivos,
      ev.local_cerimonia,
      `${ev.cidade_cerimonia}/${ev.estado_uf}`,
      FORMACAO_LABELS[ev.tipo_formacao] || ev.tipo_formacao,
      STATUS_EVENTO_LABELS[ev.status] || ev.status,
      formatDecimalBR(bruto),
      formatDecimalBR(recebido),
      formatDecimalBR(aReceber),
      formatDecimalBR(gastoCaches),
      formatDecimalBR(gastoDesloc),
      formatDecimalBR(gastoSom),
      formatDecimalBR(despesas),
      formatDecimalBR(pagoMusicos),
      formatDecimalBR(pendenteMusicos),
      formatDecimalBR(lucro),
      formatDecimalBR(margem),
    ]);
  }

  const margemGeral = totalBruto > 0 ? (totalLucro / totalBruto) * 100 : 0;

  rows.push([]);
  rows.push([
    'TOTAL GERAL (ATIVOS)',
    '',
    `${ordenados.filter((e) => e.status !== 'CANCELADO').length} cerimônias`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    formatDecimalBR(totalBruto),
    formatDecimalBR(totalRecebido),
    formatDecimalBR(totalAReceber),
    formatDecimalBR(totalGastoCaches),
    formatDecimalBR(totalGastoDesloc),
    formatDecimalBR(totalGastoSom),
    formatDecimalBR(totalDespesas),
    formatDecimalBR(totalPagoMusicos),
    formatDecimalBR(totalPendenteMusicos),
    formatDecimalBR(totalLucro),
    formatDecimalBR(margemGeral),
  ]);

  // Seção 2: Resumo Consolidado por Mês
  rows.push([]);
  rows.push([]);
  rows.push(['RESUMO FINANCEIRO AGRUPADO POR MÊS']);
  rows.push([
    'Mês / Ano',
    'Total Cerimônias',
    'Meus Contratos',
    'Cachês Freelancer',
    'Faturamento Bruto (R$)',
    'Gasto Mensal (R$)',
    'Lucro Líquido Mensal (R$)',
    'Já Recebido (R$)',
    'Saldo a Receber (R$)',
  ]);

  for (const [, m] of resumoPorMes.entries()) {
    rows.push([
      m.label,
      String(m.qtd),
      String(m.proprios),
      String(m.freelancers),
      formatDecimalBR(m.bruto),
      formatDecimalBR(m.despesas),
      formatDecimalBR(m.lucro),
      formatDecimalBR(m.recebido),
      formatDecimalBR(m.aReceber),
    ]);
  }

  const slug = tituloPeriodo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');

  triggerDownloadCsv(`relatorio-financeiro-casamentos-${slug || 'geral'}.csv`, rows);
}

/**
 * Exporta o DRE detalhado de um único casamento 360º para Excel (.CSV)
 */
export function exportarDRECasamento360CSV(evento: EventoCasamento360): void {
  const dre = evento.resumo_financeiro;
  const isFreelancer = evento.tipo_contratacao === 'FREELANCER_CACHE';
  const rows: string[][] = [];

  rows.push([
    `FICHA FINANCEIRA E ROTEIRO 360º — ${evento.nome_noivos.toUpperCase()} (${evento.codigo_contrato || `#${evento.id}`})`,
  ]);
  rows.push([
    'Data da Cerimônia',
    formatDateBR(evento.data_casamento),
    'Horário Chegada',
    formatTimeShort(evento.horario_chegada_banda),
    'Horário Início Cerimônia',
    formatTimeShort(evento.horario_inicio_cerimonia),
  ]);
  rows.push([
    'Local',
    evento.local_cerimonia,
    'Cidade/UF',
    `${evento.cidade_cerimonia}/${evento.estado_uf}`,
    'Formação',
    FORMACAO_LABELS[evento.tipo_formacao],
  ]);
  rows.push([
    'Modalidade',
    isFreelancer ? 'Cachê Freelancer (Outra Banda)' : 'Contrato Próprio (Noivos)',
    'Banda Contratante',
    evento.nome_banda_contratante || '—',
    'Status',
    STATUS_EVENTO_LABELS[evento.status],
  ]);
  rows.push([]);

  // 1. Resumo DRE
  rows.push(['1. DEMONSTRATIVO DE RESULTADO DO CASAMENTO (DRE)']);
  rows.push(['Indicador Financeiro', 'Valor (R$)']);
  rows.push(['(+) Receita Bruta / Cachê', formatDecimalBR(dre.receita_bruta)]);
  rows.push(['(-) Custo Cachês Músicos', formatDecimalBR(dre.custo_caches)]);
  rows.push(['(-) Custo Deslocamento / Combustível', formatDecimalBR(dre.custo_deslocamento)]);
  rows.push(['(-) Custo Sonorização / Técnico', formatDecimalBR(dre.custo_sonorizacao)]);
  rows.push(['(=) Despesa Operacional Total', formatDecimalBR(dre.despesas_totais)]);
  rows.push(['(=) LUCRO LÍQUIDO DA CERIMÔNIA', formatDecimalBR(dre.lucro_liquido_banda)]);
  rows.push(['Margem Líquida (%)', `${formatDecimalBR(dre.margem_lucro_percentual)}%`]);
  rows.push(['Receita Já Recebida', formatDecimalBR(dre.receita_ja_recebida)]);
  rows.push(['Saldo Pendente a Receber', formatDecimalBR(dre.saldo_a_receber_noivos)]);
  rows.push([]);

  // 2. Parcelas de Recebimento
  rows.push(['2. CRONOGRAMA DE PARCELAS / RECEBIMENTOS']);
  rows.push([
    'Nº Parcela',
    'Descrição',
    'Tipo',
    'Forma Pagamento',
    'Vencimento',
    'Data Pagamento',
    'Status',
    'Valor (R$)',
  ]);
  for (const p of evento.parcelas) {
    rows.push([
      `${p.numero_parcela}ª`,
      p.descricao,
      TIPO_PARCELA_LABELS[p.tipo_parcela],
      FORMA_PAGAMENTO_LABELS[p.forma_pagamento],
      formatDateBR(p.data_vencimento),
      p.data_pagamento ? formatDateBR(p.data_pagamento) : '—',
      STATUS_PARCELA_LABELS[p.status],
      formatDecimalBR(p.valor_parcela),
    ]);
  }
  rows.push([]);

  // 3. Escala de Músicos e Cachês
  rows.push(['3. ESCALA DE MÚSICOS & CACHÊS']);
  rows.push([
    'Músico',
    'Instrumento / Função',
    'Chave PIX',
    'Confirmação',
    'Status Pagamento',
    'Cachê (R$)',
    'Deslocamento (R$)',
    'Total Músico (R$)',
  ]);
  for (const esc of evento.escalas) {
    rows.push([
      esc.musico?.nome_completo || `Músico #${esc.musico_id}`,
      esc.instrumento_no_evento,
      esc.musico?.chave_pix || '—',
      STATUS_CONFIRMACAO_LABELS[esc.status_confirmacao],
      esc.status_pagamento,
      formatDecimalBR(esc.valor_cache_combinado),
      formatDecimalBR(esc.taxa_deslocamento_combustivel),
      formatDecimalBR(esc.valor_total),
    ]);
  }
  rows.push([]);

  // 4. Roteiro Musical / Setlist
  rows.push(['4. ROTEIRO DE MÚSICAS DA CERIMÔNIA (ORDEM DE ENTRADA)']);
  rows.push([
    'Ordem',
    'Entrada / Momento da Cerimônia',
    'Música',
    'Artista / Referência',
    'Tom',
    'BPM',
    'Usa Playback (VS)',
    'Deixa de Entrada / Observações',
  ]);
  for (const rep of evento.repertorio) {
    rows.push([
      `${rep.ordem_execucao}º`,
      MOMENTO_CERIMONIA_LABELS[rep.momento_cerimonia],
      rep.nome_musica,
      rep.artista_versao_referencia || '—',
      rep.tom_musica || '—',
      rep.andamento_bpm ? String(rep.andamento_bpm) : '—',
      rep.usa_playback ? 'SIM (VS)' : 'NÃO',
      rep.observacoes_arranjo || '—',
    ]);
  }

  const codigoSlug = (evento.codigo_contrato || `casamento-${evento.id}`).toLowerCase();
  triggerDownloadCsv(`dre-casamento-${codigoSlug}.csv`, rows);
}

/**
 * 2. CONVOCAÇÃO PARA WHATSAPP (INDIVIDUAL POR MÚSICO E ROTEIRO PARA GRUPO DA BANDA)
 */
export function gerarTextoConvocacaoMusicoWhatsApp(
  evento: EventoCasamento360,
  escala: EscalaMusico
): string {
  const nomeMusico = escala.musico?.nome_completo || 'Músico';
  const dataFormatada = formatDateBR(evento.data_casamento);
  const horaChegada = formatTimeShort(evento.horario_chegada_banda);
  const horaInicio = formatTimeShort(evento.horario_inicio_cerimonia);

  const linhasRepertorio =
    evento.repertorio.length > 0
      ? evento.repertorio
          .map((rep) => {
            const momento = MOMENTO_CERIMONIA_LABELS[rep.momento_cerimonia];
            const tom = rep.tom_musica ? ` | *Tom: ${rep.tom_musica}*` : '';
            const bpm = rep.andamento_bpm ? ` (${rep.andamento_bpm} BPM)` : '';
            const playback = rep.usa_playback ? ' [Playback VS]' : '';
            const deixa = rep.observacoes_arranjo
              ? `\n   ↳ _Deixa: ${rep.observacoes_arranjo}_`
              : '';
            return `${rep.ordem_execucao}º *${momento}*: ${rep.nome_musica}${
              rep.artista_versao_referencia ? ` (${rep.artista_versao_referencia})` : ''
            }${tom}${bpm}${playback}${deixa}`;
          })
          .join('\n')
      : '_Repertório em definição._';

  const partes = [
    `Olá, *${nomeMusico}*! Tudo bem? 🎻🎶`,
    `Segue a sua *Convocação / Escala Musical* para o casamento:`,
    ``,
    `💍 *Cerimônia:* ${evento.nome_noivos}`,
    `📅 *Data:* ${dataFormatada}`,
    `⏰ *Chegada / Passagem de Som:* ${horaChegada}`,
    `🔔 *Horário Marcado de Início da Cerimônia:* *${horaInicio}*`,
    `📍 *Local:* ${evento.local_cerimonia} (${evento.cidade_cerimonia}/${evento.estado_uf})`,
    evento.endereco_completo ? `🗺️ *Endereço:* ${evento.endereco_completo}` : null,
    ``,
    `🎼 *Sua Função/Instrumento:* ${escala.instrumento_no_evento}`,
    escala.observacoes_escala ? `📌 *Obs. da Escala:* ${escala.observacoes_escala}` : null,
    `💰 *Cachê Combinado:* ${formatCurrency(escala.valor_cache_combinado)} + Deslocamento ${formatCurrency(
      escala.taxa_deslocamento_combustivel
    )} = *Total: ${formatCurrency(escala.valor_total)}*`,
    escala.musico?.chave_pix ? `🔑 *Chave PIX cadastrada:* ${escala.musico.chave_pix}` : null,
    ``,
    `🎵 *ORDEM EXATA DAS MÚSICAS & ENTRADAS (${evento.repertorio.length}):*`,
    linhasRepertorio,
    ``,
    `Pode confirmar recebimento e presença na escala? Muito obrigado! 🙏✨`,
  ].filter((x) => x !== null);

  return partes.join('\n');
}

export function gerarLinkConvocacaoMusicoWhatsApp(
  evento: EventoCasamento360,
  escala: EscalaMusico
): string {
  const telefone = escala.musico?.telefone_whatsapp || '';
  let digits = telefone.replace(/\D/g, '');
  if (digits.length > 0 && !digits.startsWith('55')) {
    digits = `55${digits}`;
  }
  const texto = gerarTextoConvocacaoMusicoWhatsApp(evento, escala);
  return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`;
}

export function gerarTextoRoteiroGrupoWhatsApp(evento: EventoCasamento360): string {
  const dataFormatada = formatDateBR(evento.data_casamento);
  const horaChegada = formatTimeShort(evento.horario_chegada_banda);
  const horaInicio = formatTimeShort(evento.horario_inicio_cerimonia);

  const listaMusicas =
    evento.repertorio.length > 0
      ? evento.repertorio
          .map((rep) => {
            const momento = MOMENTO_CERIMONIA_LABELS[rep.momento_cerimonia];
            const tom = rep.tom_musica ? ` | *Tom: ${rep.tom_musica}*` : '';
            const bpm = rep.andamento_bpm ? ` | ${rep.andamento_bpm} BPM` : '';
            const vs = rep.usa_playback ? ' | 🎧 *PLAYBACK VS*' : '';
            const deixa = rep.observacoes_arranjo
              ? `\n   ↳ ⚠️ *Deixa:* ${rep.observacoes_arranjo}`
              : '';
            return `*${rep.ordem_execucao}º [${momento.toUpperCase()}]*\n   🎶 *${rep.nome_musica}*${
              rep.artista_versao_referencia ? ` (${rep.artista_versao_referencia})` : ''
            }${tom}${bpm}${vs}${deixa}`;
          })
          .join('\n\n')
      : '_Nenhuma música cadastrada no roteiro._';

  return [
    `📋 *FOLHA DE PALCO & ROTEIRO DA CERIMÔNIA*`,
    `💍 *Casamento:* ${evento.nome_noivos}`,
    `📅 *Data:* ${dataFormatada}`,
    `⏰ *Chegada / Passagem de Som:* ${horaChegada}`,
    `🔔 *HORÁRIO DE INÍCIO DA CERIMÔNIA:* *${horaInicio}*`,
    `📍 *Local:* ${evento.local_cerimonia} (${evento.cidade_cerimonia}/${evento.estado_uf})`,
    evento.endereco_completo ? `🗺️ *Endereço:* ${evento.endereco_completo}` : '',
    ``,
    `🎼 *ORDEM EXATA DAS ENTRADAS E MÚSICAS (${evento.repertorio.length}):*`,
    listaMusicas,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * 1. FOLHA DE PALCO / SETLIST PARA IMPRESSÃO E PDF (A4)
 */
export function imprimirFolhaDePalcoPDF(evento: EventoCasamento360): void {
  const win = window.open('', '_blank', 'width=1024,height=800');
  if (!win) {
    alert(
      'Permita pop-ups no navegador para abrir a página de impressão/PDF da Folha de Palco.'
    );
    return;
  }

  const dataBR = formatDateBR(evento.data_casamento);
  const horaChegada = formatTimeShort(evento.horario_chegada_banda);
  const horaInicio = formatTimeShort(evento.horario_inicio_cerimonia);

  const linhasMusicasHtml =
    evento.repertorio.length > 0
      ? evento.repertorio
          .map((rep) => {
            const nomeEntrada = MOMENTO_CERIMONIA_LABELS[rep.momento_cerimonia];
            return `
              <tr>
                <td class="col-ordem">
                  <div class="badge-ordem">${rep.ordem_execucao}º</div>
                </td>
                <td class="col-entrada">
                  <div class="entrada-pill">${nomeEntrada}</div>
                </td>
                <td class="col-musica">
                  <div class="musica-titulo">
                    ${rep.nome_musica}
                    ${
                      rep.usa_playback
                        ? '<span class="badge-vs">PLAYBACK VS</span>'
                        : ''
                    }
                  </div>
                  ${
                    rep.artista_versao_referencia
                      ? `<div class="musica-artista">${rep.artista_versao_referencia}</div>`
                      : ''
                  }
                  ${
                    rep.observacoes_arranjo
                      ? `<div class="musica-deixa"><strong>Deixa de Entrada:</strong> ${rep.observacoes_arranjo}</div>`
                      : ''
                  }
                </td>
                <td class="col-tom">
                  <div class="badge-tom">${rep.tom_musica || '—'}</div>
                  ${
                    rep.andamento_bpm
                      ? `<div class="tom-bpm">${rep.andamento_bpm} BPM</div>`
                      : ''
                  }
                  ${
                    rep.duracao_playback
                      ? `<div class="tom-bpm">⏱ ${rep.duracao_playback}</div>`
                      : ''
                  }
                </td>
              </tr>
            `;
          })
          .join('')
      : `<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748b;">Nenhuma música cadastrada no repertório desta cerimônia.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Folha de Palco & Roteiro da Cerimônia - ${evento.nome_noivos} (${dataBR})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 24px 30px;
      line-height: 1.4;
    }
    .top-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #fff;
      padding: 12px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .btn-print {
      background: #f59e0b;
      color: #0f172a;
      border: none;
      font-weight: 800;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .header-box {
      border: 2px solid #0f172a;
      border-radius: 14px;
      padding: 18px 22px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      gap: 20px;
    }
    .header-left { flex: 1; }
    .brand-tag {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #b45309;
      margin-bottom: 4px;
    }
    .wedding-title {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .wedding-meta {
      font-size: 13px;
      color: #334155;
      margin-top: 3px;
    }
    .horarios-box {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .horario-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px 16px;
      text-align: center;
      min-width: 125px;
      background: #f8fafc;
    }
    .horario-card.destaque-inicio {
      border: 2.5px solid #0f172a;
      background: #fef3c7;
    }
    .horario-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
    }
    .horario-valor {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    .section-block {
      margin-top: 20px;
    }
    .section-title {
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 8px 14px;
      border-radius: 8px 8px 0 0;
    }
    table.setlist-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
    }
    table.setlist-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 9px 12px;
      border-bottom: 1.5px solid #0f172a;
      text-align: left;
    }
    table.setlist-table td {
      padding: 12px;
      border-bottom: 1px solid #cbd5e1;
      vertical-align: top;
    }
    table.setlist-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .col-ordem { width: 58px; text-align: center; }
    .badge-ordem {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #0f172a;
      color: #fbbf24;
      font-weight: 900;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .col-entrada { width: 220px; }
    .entrada-pill {
      display: inline-block;
      background: #fef3c7;
      border: 1.5px solid #f59e0b;
      color: #78350f;
      font-weight: 800;
      font-size: 13px;
      padding: 5px 10px;
      border-radius: 8px;
      text-transform: uppercase;
    }
    .musica-titulo {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .badge-vs {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 800;
      background: #0f172a;
      color: #fbbf24;
      border-radius: 4px;
      vertical-align: middle;
    }
    .musica-artista {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }
    .musica-deixa {
      margin-top: 6px;
      padding: 6px 10px;
      background: #fffbeb;
      border-left: 3.5px solid #f59e0b;
      font-size: 12.5px;
      color: #78350f;
      border-radius: 4px;
    }
    .col-tom { width: 135px; text-align: center; }
    .badge-tom {
      display: inline-block;
      font-family: monospace;
      font-size: 15px;
      font-weight: 900;
      padding: 4px 10px;
      background: #e2e8f0;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      color: #0f172a;
    }
    .tom-bpm {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
      font-weight: 600;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="top-actions no-print">
    <div>
      <strong>Folha de Palco & Roteiro da Cerimônia — Pronta para Impressão ou Salvar em PDF</strong>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
  </div>

  <div class="header-box">
    <div class="header-left">
      <div class="brand-tag">Folha de Palco & Roteiro da Cerimônia</div>
      <div class="wedding-title">${evento.nome_noivos}</div>
      <div class="wedding-meta"><strong>Data:</strong> ${dataBR}</div>
      <div class="wedding-meta"><strong>Local:</strong> ${evento.local_cerimonia} (${evento.cidade_cerimonia}/${evento.estado_uf})</div>
      ${
        evento.endereco_completo
          ? `<div class="wedding-meta"><strong>Endereço:</strong> ${evento.endereco_completo}</div>`
          : ''
      }
    </div>

    <div class="horarios-box">
      <div class="horario-card">
        <div class="horario-label">Chegada / Som</div>
        <div class="horario-valor">${horaChegada}</div>
      </div>
      <div class="horario-card destaque-inicio">
        <div class="horario-label">Início Cerimônia</div>
        <div class="horario-valor">${horaInicio}</div>
      </div>
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">ORDEM EXATA DAS MÚSICAS, ENTRADAS, TONS E DEIXAS (${evento.repertorio.length} MÚSICAS)</div>
    <table class="setlist-table">
      <thead>
        <tr>
          <th class="col-ordem">Ordem</th>
          <th class="col-entrada">Nome da Entrada / Momento</th>
          <th>Música, Versão & Deixa de Entrada</th>
          <th class="col-tom">Tom / Andamento</th>
        </tr>
      </thead>
      <tbody>
        ${linhasMusicasHtml}
      </tbody>
    </table>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
