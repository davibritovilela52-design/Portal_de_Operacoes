import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'outputs', '2026-05-15-budget-analytics-template');
const previewDir = path.join(repoRoot, '.tmp', 'budget-analytics-template-preview');
const workbookPath = path.join(outputDir, 'operations_budget_analytics_template.xlsx');
const summaryPreviewPath = path.join(previewDir, 'resumo.png');
const sourcePreviewPath = path.join(previewDir, 'movimentos.png');

const currencyFormat = '"R$" #,##0.00;[Red]("R$" #,##0.00);-';
const integerFormat = '#,##0;[Red](#,##0);-';
const percentFormat = '0.0%;[Red](0.0%);-';
const dateFormat = 'yyyy-mm-dd';

const accentFill = {
  type: 'solid',
  color: { type: 'theme', value: 'accent1', transform: { darken: 10 } }
};
const secondaryFill = {
  type: 'solid',
  color: { type: 'theme', value: 'accent1', transform: { lighten: 65 } }
};
const neutralFill = {
  type: 'solid',
  color: '#F8FAFC'
};

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function colLetter(columnNumber) {
  let current = columnNumber;
  let result = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function rangeAddress(startColumn, startRow, endColumn, endRow) {
  return `${colLetter(startColumn)}${startRow}:${colLetter(endColumn)}${endRow}`;
}

function applyTitle(sheet, lastColumn, title, subtitle) {
  const titleRange = sheet.getRange(rangeAddress(1, 1, lastColumn, 1));
  titleRange.merge();
  sheet.getRange('A1').values = [[title]];
  titleRange.format = {
    fill: accentFill,
    font: { name: 'Calibri', size: 16, bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  };

  const subtitleRange = sheet.getRange(rangeAddress(1, 2, lastColumn, 2));
  subtitleRange.merge();
  sheet.getRange('A2').values = [[subtitle]];
  subtitleRange.format = {
    fill: secondaryFill,
    font: { name: 'Calibri', size: 10, color: '#1F2937' },
    horizontalAlignment: 'left',
    verticalAlignment: 'center'
  };
}

function applySectionHeader(sheet, startColumn, endColumn, row, title) {
  const headerRange = sheet.getRange(rangeAddress(startColumn, row, endColumn, row));
  headerRange.merge();
  sheet.getRange(`${colLetter(startColumn)}${row}`).values = [[title]];
  headerRange.format = {
    fill: secondaryFill,
    font: { name: 'Calibri', size: 11, bold: true, color: '#0F172A' },
    horizontalAlignment: 'left',
    verticalAlignment: 'center',
    borders: { preset: 'outside', style: 'thin', color: '#CBD5E1' }
  };
}

function addTable(sheet, address, name, style = 'TableStyleMedium2') {
  const table = sheet.tables.add(address, true);
  table.name = name;
  table.style = style;
  return table;
}

function applyGrid(sheet, address) {
  sheet.getRange(address).format = {
    borders: { preset: 'inside', style: 'thin', color: '#CBD5E1' },
    font: { name: 'Calibri', size: 10, color: '#0F172A' },
    verticalAlignment: 'center'
  };
}

function applyCurrency(sheet, address) {
  sheet.getRange(address).format.numberFormat = currencyFormat;
}

function applyInteger(sheet, address) {
  sheet.getRange(address).format.numberFormat = integerFormat;
}

function applyPercent(sheet, address) {
  sheet.getRange(address).format.numberFormat = percentFormat;
}

function applyDate(sheet, address) {
  sheet.getRange(address).format.numberFormat = dateFormat;
}

function makeSummaryFormula(targetMetric, monthReference, yearReference) {
  const monthPredicatePlan = monthReference
    ? `*(Orcamento_Mensal!$D$5:$D$300=${monthReference})`
    : '';
  const monthPredicateMov = monthReference
    ? `*(Movimentos!$D$5:$D$300=${monthReference})`
    : '';
  const monthPredicateAlloc = monthReference
    ? `*(Rateios!$E$5:$E$300=${monthReference})`
    : '';

  const assetFilterPlan =
    `--((($B$7="TODOS")+(Orcamento_Mensal!$G$5:$G$300=$B$7))>0)`;
  const costCenterFilterPlan =
    `--((($B$8="TODOS")+(Orcamento_Mensal!$I$5:$I$300=$B$8))>0)`;
  const itemFilterPlan =
    `--((($B$9="TODOS")+(Orcamento_Mensal!$K$5:$K$300=$B$9))>0)`;

  const assetFilterMov =
    `--((($B$7="TODOS")+(Movimentos!$G$5:$G$300=$B$7))>0)`;
  const costCenterFilterMov =
    `--((($B$8="TODOS")+(Movimentos!$I$5:$I$300=$B$8))>0)`;
  const itemFilterMov =
    `--((($B$9="TODOS")+(Movimentos!$K$5:$K$300=$B$9))>0)`;

  const assetFilterAlloc =
    `--((($B$7="TODOS")+(Rateios!$J$5:$J$300=$B$7))>0)`;
  const costCenterFilterAlloc =
    `--((($B$8="TODOS")+(Rateios!$K$5:$K$300=$B$8))>0)`;
  const itemFilterAlloc =
    `--((($B$9="TODOS")+(Rateios!$L$5:$L$300=$B$9))>0)`;

  if (targetMetric === 'approved') {
    return `=SUMPRODUCT((Orcamento_Mensal!$C$5:$C$300=${yearReference})${monthPredicatePlan}*${assetFilterPlan}*${costCenterFilterPlan}*${itemFilterPlan}*Orcamento_Mensal!$N$5:$N$300)`;
  }

  if (targetMetric === 'provisioned_open') {
    return `=SUMPRODUCT((Movimentos!$C$5:$C$300=${yearReference})${monthPredicateMov}*(Movimentos!$N$5:$N$300="direct")*(Movimentos!$L$5:$L$300="provisioned")*(Movimentos!$M$5:$M$300="open")*${assetFilterMov}*${costCenterFilterMov}*${itemFilterMov}*Movimentos!$V$5:$V$300)+SUMPRODUCT((Rateios!$D$5:$D$300=${yearReference})${monthPredicateAlloc}*(Rateios!$G$5:$G$300="provisioned")*(Rateios!$H$5:$H$300="open")*${assetFilterAlloc}*${costCenterFilterAlloc}*${itemFilterAlloc}*Rateios!$M$5:$M$300)`;
  }

  if (targetMetric === 'realized') {
    return `=SUMPRODUCT((Movimentos!$C$5:$C$300=${yearReference})${monthPredicateMov}*(Movimentos!$N$5:$N$300="direct")*(Movimentos!$L$5:$L$300="realized")*${assetFilterMov}*${costCenterFilterMov}*${itemFilterMov}*Movimentos!$V$5:$V$300)+SUMPRODUCT((Rateios!$D$5:$D$300=${yearReference})${monthPredicateAlloc}*(Rateios!$G$5:$G$300="realized")*${assetFilterAlloc}*${costCenterFilterAlloc}*${itemFilterAlloc}*Rateios!$M$5:$M$300)`;
  }

  throw new Error(`Unsupported summary metric: ${targetMetric}`);
}

function buildWorkbook() {
  const workbook = Workbook.create();

  const readme = workbook.worksheets.add('README');
  applyTitle(
    readme,
    8,
    'Template de Base Analitica de Orcamento',
    'Workbook leve para budget mensal, provisionado, realizado, saldo e rateio por ativo, centro de custo e item.'
  );
  readme.getRange('A4:B8').values = [
    ['Preenchimento', 'Ordem sugerida'],
    ['1', 'Dimensoes'],
    ['2', 'Orcamento_Mensal'],
    ['3', 'Movimentos'],
    ['4', 'Rateios somente para allocation_mode = allocated']
  ];
  readme.getRange('D4:E10').values = [
    ['Convencao', 'Regra'],
    ['Ano', 'Sempre filtrar pela coluna competence_year'],
    ['Mes', 'Usar competencia 1-12 no Resumo'],
    ['Provisionado', 'Obrigacao aberta ainda nao paga'],
    ['Realizado', 'Pagamento efetivo'],
    ['Comprometido', 'Provisionado aberto + realizado'],
    ['Saldo', 'Aprovado - comprometido']
  ];
  readme.getRange('A4:E10').format = {
    borders: { preset: 'inside', style: 'thin', color: '#CBD5E1' },
    font: { name: 'Calibri', size: 10, color: '#0F172A' }
  };
  readme.getRange('A4:E4').format = {
    fill: secondaryFill,
    font: { name: 'Calibri', size: 10, bold: true, color: '#0F172A' }
  };
  readme.getRange('A1:H14').format.autofitColumns();

  const summary = workbook.worksheets.add('Resumo');
  applyTitle(
    summary,
    14,
    'Resumo de Orcamento e Execucao',
    'Filtros manuais em B5:B9. O workbook calcula aprovado, provisionado, realizado, comprometido e saldo mensal/anual.'
  );
  applySectionHeader(summary, 1, 3, 4, 'Filtros');
  summary.getRange('A5:B9').values = [
    ['Ano de analise', 2026],
    ['Mes comp.', 5],
    ['Ativo', 'TODOS'],
    ['Centro custo', 'TODOS'],
    ['Item orcam.', 'TODOS']
  ];
  summary.getRange('A5:B9').format = {
    borders: { preset: 'inside', style: 'thin', color: '#CBD5E1' },
    font: { name: 'Calibri', size: 10, color: '#0F172A' }
  };
  summary.getRange('A5:A9').format = {
    fill: neutralFill,
    font: { name: 'Calibri', size: 10, bold: true, color: '#0F172A' }
  };
  summary.getRange('B5').dataValidation = {
    rule: { type: 'whole', operator: 'between', formula1: 2020, formula2: 2100 }
  };
  summary.getRange('B6').dataValidation = {
    list: { inCellDropDown: true, source: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] }
  };

  applySectionHeader(summary, 4, 6, 4, 'Visao mensal');
  summary.getRange('D5:E10').values = [
    ['Aprovado', null],
    ['Prov. aberto', null],
    ['Realizado', null],
    ['Compromet.', null],
    ['Saldo', null],
    ['Status', null]
  ];
  summary.getRange('E5').formulas = [[makeSummaryFormula('approved', '$B$6', '$B$5')]];
  summary.getRange('E6').formulas = [[makeSummaryFormula('provisioned_open', '$B$6', '$B$5')]];
  summary.getRange('E7').formulas = [[makeSummaryFormula('realized', '$B$6', '$B$5')]];
  summary.getRange('E8').formulas = [['=E6+E7']];
  summary.getRange('E9').formulas = [['=E5-E8']];
  summary.getRange('E10').formulas = [['=IF(E9<0,"DEFICIT",IF(E9>0,"SUPERAVIT","ZERADO"))']];

  applySectionHeader(summary, 7, 9, 4, 'Visao anual');
  summary.getRange('G5:H10').values = [
    ['Aprovado', null],
    ['Prov. aberto', null],
    ['Realizado', null],
    ['Compromet.', null],
    ['Saldo', null],
    ['Status', null]
  ];
  summary.getRange('H5').formulas = [[makeSummaryFormula('approved', null, '$B$5')]];
  summary.getRange('H6').formulas = [[makeSummaryFormula('provisioned_open', null, '$B$5')]];
  summary.getRange('H7').formulas = [[makeSummaryFormula('realized', null, '$B$5')]];
  summary.getRange('H8').formulas = [['=H6+H7']];
  summary.getRange('H9').formulas = [['=H5-H8']];
  summary.getRange('H10').formulas = [['=IF(H9<0,"DEFICIT",IF(H9>0,"SUPERAVIT","ZERADO"))']];
  summary.getRange('D5:H10').format = {
    borders: { preset: 'inside', style: 'thin', color: '#CBD5E1' },
    font: { name: 'Calibri', size: 10, color: '#0F172A' }
  };
  summary.getRange('D5:D10').format = {
    fill: neutralFill,
    font: { name: 'Calibri', size: 10, bold: true, color: '#0F172A' }
  };
  summary.getRange('G5:G10').format = {
    fill: neutralFill,
    font: { name: 'Calibri', size: 10, bold: true, color: '#0F172A' }
  };
  applyCurrency(summary, 'E5:E9');
  applyCurrency(summary, 'H5:H9');

  applySectionHeader(summary, 1, 6, 13, 'Trend mensal do ano selecionado');
  summary.getRange('A14:F26').values = [
    ['Mes', 'Label', 'Aprovado', 'Comprometido', 'Realizado', 'Saldo'],
    ...monthLabels.map((label, index) => [index + 1, label, null, null, null, null])
  ];
  for (let row = 15; row <= 26; row += 1) {
    summary.getRange(`C${row}`).formulas = [[makeSummaryFormula('approved', `$A${row}`, '$B$5')]];
    summary.getRange(`D${row}`).formulas = [[`=${makeSummaryFormula('provisioned_open', `$A${row}`, '$B$5').slice(1)}+${makeSummaryFormula('realized', `$A${row}`, '$B$5').slice(1)}`]];
    summary.getRange(`E${row}`).formulas = [[makeSummaryFormula('realized', `$A${row}`, '$B$5')]];
    summary.getRange(`F${row}`).formulas = [[`=C${row}-D${row}`]];
  }
  summary.getRange('A14:F26').format = {
    borders: { preset: 'inside', style: 'thin', color: '#CBD5E1' },
    font: { name: 'Calibri', size: 10, color: '#0F172A' }
  };
  summary.getRange('A14:F14').format = {
    fill: secondaryFill,
    font: { name: 'Calibri', size: 10, bold: true, color: '#0F172A' }
  };
  applyCurrency(summary, 'C15:F26');
  applyInteger(summary, 'A15:A26');
  const chart = summary.charts.add('ColumnClustered', summary.getRange('B14:F26'), 'Auto');
  chart.title.text = 'Trend mensal budget x execucao';
  chart.setPosition(summary.getRange('H13:N28'));
  chart.width = 640;
  chart.height = 320;

  const dimensions = workbook.worksheets.add('Dimensoes');
  applyTitle(
    dimensions,
    11,
    'Dimensoes estruturais',
    'Uma linha por combinacao de ativo, centro de custo e item orcamentario.'
  );
  const dimHeaders = [
    'dimension_id',
    'modality',
    'asset_id',
    'asset_name',
    'cost_center_code',
    'cost_center_name',
    'budget_item_code',
    'budget_item_name',
    'budget_group',
    'cost_nature',
    'active_flag'
  ];
  dimensions.getRange(rangeAddress(1, 4, 11, 5)).values = [
    dimHeaders,
    ['', '', '', '', '', '', '', '', '', '', '']
  ];
  addTable(dimensions, rangeAddress(1, 4, 11, 5), 'tblDim');
  dimensions.getRange('B5:B300').dataValidation = {
    list: { inCellDropDown: true, source: ['Yachts', 'Aviation', 'Real Estate', 'Cars'] }
  };
  dimensions.getRange('J5:J300').dataValidation = {
    list: { inCellDropDown: true, source: ['fixed', 'variable'] }
  };
  dimensions.getRange('K5:K300').dataValidation = {
    list: { inCellDropDown: true, source: ['yes', 'no'] }
  };
  applyGrid(dimensions, 'A4:K20');
  dimensions.freezePanes.freezeRows(4);
  dimensions.getRange('A1:K20').format.autofitColumns();

  const plan = workbook.worksheets.add('Orcamento_Mensal');
  applyTitle(
    plan,
    15,
    'Budget mensal por competencia',
    'Preencher approved_amount como baseline oficial. Colunas auxiliares buscam descricao da dimensao.'
  );
  const planHeaders = [
    'plan_row_id',
    'dimension_id',
    'competence_year',
    'competence_month_number',
    'competence_month',
    'asset_id',
    'asset_name',
    'cost_center_code',
    'cost_center_name',
    'budget_item_code',
    'budget_item_name',
    'planned_amount',
    'reforecast_amount',
    'approved_amount',
    'notes'
  ];
  plan.getRange(rangeAddress(1, 4, 15, 5)).values = [
    planHeaders,
    ['', '', 2026, 5, new Date('2026-05-01T00:00:00.000Z'), '', '', '', '', '', '', '', '', '', '']
  ];
  addTable(plan, rangeAddress(1, 4, 15, 5), 'tblPlan');
  plan.getRange('F5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$C$5:$C$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  plan.getRange('G5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$D$5:$D$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  plan.getRange('H5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$E$5:$E$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  plan.getRange('I5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$F$5:$F$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  plan.getRange('J5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$G$5:$G$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  plan.getRange('K5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$H$5:$H$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  applyInteger(plan, 'C5:D300');
  applyDate(plan, 'E5:E300');
  applyCurrency(plan, 'L5:N300');
  applyGrid(plan, 'A4:O20');
  plan.freezePanes.freezeRows(4);
  plan.getRange('A1:O20').format.autofitColumns();

  const movements = workbook.worksheets.add('Movimentos');
  applyTitle(
    movements,
    23,
    'Movimentacao financeira',
    'Preencher movement_type, financial_status e allocation_mode. Colunas auxiliares buscam a descricao da dimensao.'
  );
  const movementHeaders = [
    'movement_id',
    'dimension_id',
    'competence_year',
    'competence_month_number',
    'competence_month',
    'asset_id',
    'asset_name',
    'cost_center_code',
    'cost_center_name',
    'budget_item_code',
    'budget_item_name',
    'movement_type',
    'financial_status',
    'allocation_mode',
    'supplier_name',
    'document_number',
    'document_date',
    'due_date',
    'payment_date',
    'gross_amount',
    'tax_amount',
    'net_amount',
    'notes'
  ];
  movements.getRange(rangeAddress(1, 4, 23, 5)).values = [
    movementHeaders,
    ['', '', 2026, 5, new Date('2026-05-01T00:00:00.000Z'), '', '', '', '', '', '', 'provisioned', 'open', 'direct', '', '', '', '', '', '', '', '', '']
  ];
  addTable(movements, rangeAddress(1, 4, 23, 5), 'tblMov');
  movements.getRange('F5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$C$5:$C$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  movements.getRange('G5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$D$5:$D$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  movements.getRange('H5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$E$5:$E$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  movements.getRange('I5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$F$5:$F$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  movements.getRange('J5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$G$5:$G$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  movements.getRange('K5').formulas = [['=IF(B5="","",IFERROR(INDEX(Dimensoes!$H$5:$H$300,MATCH(B5,Dimensoes!$A$5:$A$300,0)),""))']];
  movements.getRange('V5').formulas = [['=IF(T5="","",T5-IF(U5="",0,U5))']];
  movements.getRange('L5:L300').dataValidation = {
    list: { inCellDropDown: true, source: ['provisioned', 'realized', 'reversal', 'cancelled'] }
  };
  movements.getRange('M5:M300').dataValidation = {
    list: { inCellDropDown: true, source: ['open', 'paid', 'cancelled'] }
  };
  movements.getRange('N5:N300').dataValidation = {
    list: { inCellDropDown: true, source: ['direct', 'allocated'] }
  };
  applyInteger(movements, 'C5:D300');
  applyDate(movements, 'E5:E300');
  applyDate(movements, 'Q5:S300');
  applyCurrency(movements, 'T5:V300');
  applyGrid(movements, 'A4:W20');
  movements.freezePanes.freezeRows(4);
  movements.getRange('A1:W20').format.autofitColumns();

  const allocations = workbook.worksheets.add('Rateios');
  applyTitle(
    allocations,
    13,
    'Rateios',
    'Use somente quando allocation_mode = allocated. Cada linha representa o pedaço do movimento atribuido a uma dimensao.'
  );
  const allocationHeaders = [
    'allocation_id',
    'movement_id',
    'dimension_id',
    'competence_year',
    'competence_month_number',
    'competence_month',
    'movement_type',
    'financial_status',
    'asset_id',
    'asset_name',
    'cost_center_name',
    'budget_item_name',
    'allocated_amount'
  ];
  allocations.getRange(rangeAddress(1, 4, 13, 5)).values = [
    allocationHeaders,
    ['', '', '', 2026, 5, new Date('2026-05-01T00:00:00.000Z'), '', '', '', '', '', '', '']
  ];
  addTable(allocations, rangeAddress(1, 4, 13, 5), 'tblAlloc');
  allocations.getRange('G5').formulas = [['=IF(B5="","",IFERROR(INDEX(Movimentos!$L$5:$L$300,MATCH(B5,Movimentos!$A$5:$A$300,0)),""))']];
  allocations.getRange('H5').formulas = [['=IF(B5="","",IFERROR(INDEX(Movimentos!$M$5:$M$300,MATCH(B5,Movimentos!$A$5:$A$300,0)),""))']];
  allocations.getRange('I5').formulas = [['=IF(C5="","",IFERROR(INDEX(Dimensoes!$C$5:$C$300,MATCH(C5,Dimensoes!$A$5:$A$300,0)),""))']];
  allocations.getRange('J5').formulas = [['=IF(C5="","",IFERROR(INDEX(Dimensoes!$D$5:$D$300,MATCH(C5,Dimensoes!$A$5:$A$300,0)),""))']];
  allocations.getRange('K5').formulas = [['=IF(C5="","",IFERROR(INDEX(Dimensoes!$F$5:$F$300,MATCH(C5,Dimensoes!$A$5:$A$300,0)),""))']];
  allocations.getRange('L5').formulas = [['=IF(C5="","",IFERROR(INDEX(Dimensoes!$H$5:$H$300,MATCH(C5,Dimensoes!$A$5:$A$300,0)),""))']];
  applyInteger(allocations, 'D5:E300');
  applyDate(allocations, 'F5:F300');
  applyCurrency(allocations, 'M5:M300');
  applyGrid(allocations, 'A4:M20');
  allocations.freezePanes.freezeRows(4);
  allocations.getRange('A1:M20').format.autofitColumns();

  const checks = workbook.worksheets.add('Checks');
  applyTitle(
    checks,
    6,
    'Checks de integridade',
    'Se algum status sair de CHECK, revisar a base antes de usar o Resumo como fonte executiva.'
  );
  checks.getRange('A4:F9').values = [
    ['Check', 'Actual', 'Expected', 'Difference', 'Status', 'Notes'],
    ['Movimentos direct sem dimension_id', null, 0, null, null, 'Todo direct deve apontar para uma dimensao'],
    ['Valor alocado x valor de movimentos allocated', null, null, null, null, 'A soma do rateio deve fechar o valor movimentado'],
    ['Rateios sem movement_id', null, 0, null, null, 'Nenhuma linha de rateio pode ficar solta'],
    ['Rateios sem movement_type resolvido', null, 0, null, null, 'movement_type precisa voltar do movimento origem'],
    ['Budget sem approved_amount', null, 0, null, null, 'approved_amount e o baseline oficial']
  ];
  checks.getRange('B5').formulas = [['=COUNTIFS(Movimentos!$N$5:$N$300,"direct",Movimentos!$B$5:$B$300,"")']];
  checks.getRange('B6').formulas = [['=SUM(Rateios!$M$5:$M$300)']];
  checks.getRange('C6').formulas = [['=SUMIFS(Movimentos!$V$5:$V$300,Movimentos!$N$5:$N$300,"allocated")']];
  checks.getRange('B7').formulas = [['=COUNTIF(Rateios!$B$5:$B$300,"")']];
  checks.getRange('B8').formulas = [['=COUNTIFS(Rateios!$B$5:$B$300,"<>",Rateios!$G$5:$G$300,"")']];
  checks.getRange('B9').formulas = [['=COUNTIFS(Orcamento_Mensal!$B$5:$B$300,"<>",Orcamento_Mensal!$N$5:$N$300,"")']];
  for (const row of [5, 6, 7, 8, 9]) {
    checks.getRange(`D${row}`).formulas = [[`=B${row}-C${row}`]];
    checks.getRange(`E${row}`).formulas = [[`=IF(ABS(D${row})<0.01,"OK","CHECK")`]];
  }
  checks.getRange('A4:F9').format = {
    borders: { preset: 'inside', style: 'thin', color: '#CBD5E1' },
    font: { name: 'Calibri', size: 10, color: '#0F172A' }
  };
  checks.getRange('A4:F4').format = {
    fill: secondaryFill,
    font: { name: 'Calibri', size: 10, bold: true, color: '#0F172A' }
  };
  applyCurrency(checks, 'B6:D6');
  applyInteger(checks, 'B5:D5');
  applyInteger(checks, 'B7:D9');
  checks.getRange('A1:F12').format.autofitColumns();

  return workbook;
}

async function verifyWorkbook(workbook) {
  const summaryInspect = await workbook.inspect({
    kind: 'table',
    range: 'Resumo!A4:H10',
    include: 'values,formulas',
    tableMaxRows: 7,
    tableMaxCols: 8
  });
  const errorInspect = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 100 },
    summary: 'budget template formula error scan'
  });
  const summaryPng = await workbook.render({
    sheetName: 'Resumo',
    range: 'A1:N28',
    format: 'png',
    scale: 1.5
  });
  const sourcePng = await workbook.render({
    sheetName: 'Movimentos',
    range: 'A1:W12',
    format: 'png',
    scale: 1.5
  });

  await fs.mkdir(previewDir, { recursive: true });
  await fs.writeFile(summaryPreviewPath, Buffer.from(await summaryPng.arrayBuffer()));
  await fs.writeFile(sourcePreviewPath, Buffer.from(await sourcePng.arrayBuffer()));

  return {
    summaryInspect: summaryInspect.ndjson,
    errorInspect: errorInspect.ndjson
  };
}

async function exportWorkbook(workbook) {
  await fs.mkdir(outputDir, { recursive: true });
  const file = await SpreadsheetFile.exportXlsx(workbook);
  await file.save(workbookPath);
}

async function main() {
  const workbook = buildWorkbook();
  const verification = await verifyWorkbook(workbook);
  await exportWorkbook(workbook);
  const errorText = verification.errorInspect ?? '';

  if (/#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A/.test(errorText)) {
    throw new Error(`Workbook exported with formula issues: ${errorText}`);
  }

  console.log(
    JSON.stringify(
      {
        workbookPath,
        summaryPreviewPath,
        sourcePreviewPath,
        summaryInspect: verification.summaryInspect
      },
      null,
      2
    )
  );
}

await main();
