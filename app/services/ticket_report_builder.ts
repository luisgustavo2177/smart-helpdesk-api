import ExcelJS from 'exceljs'
import { DateTime } from 'luxon'
import Ticket from '#models/ticket'

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
}

const COLUMN_HEADERS = [
  'Título',
  'Categoria',
  'Prioridade',
  'Status',
  'Solicitante',
  'Responsável',
  'Criado em',
]

const COLUMN_WIDTHS = [40, 20, 14, 16, 24, 24, 20]

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE9ECEF' },
}

export type TicketReportStats = {
  total: number
  statuses: Array<{ status: string; count: number; percentage: number }>
}

/**
 * Monta o .xlsx do relatório: aba "Chamados" (cabeçalho com nome da
 * aplicação + data de geração, colunas na linha 3, dados a partir da linha 4)
 * e aba "Resumo" com a mesma contagem/percentual por status dos cards do
 * dashboard — nada disso é recalculado no front.
 */
export async function buildTicketReportWorkbook(tickets: Ticket[], stats: TicketReportStats) {
  const workbook = new ExcelJS.Workbook()
  const generatedAt = DateTime.now().setZone('America/Sao_Paulo').toFormat("dd/MM/yyyy 'às' HH:mm")

  const ticketsSheet = workbook.addWorksheet('Chamados')

  ticketsSheet.mergeCells(1, 1, 1, COLUMN_HEADERS.length)
  const titleCell = ticketsSheet.getCell(1, 1)
  titleCell.value = 'Smart Helpdesk'
  titleCell.font = { bold: true, size: 16 }

  ticketsSheet.mergeCells(2, 1, 2, COLUMN_HEADERS.length)
  const generatedAtCell = ticketsSheet.getCell(2, 1)
  generatedAtCell.value = `Relatório gerado em ${generatedAt}`
  generatedAtCell.font = { italic: true, color: { argb: 'FF666666' } }

  const headerRow = ticketsSheet.getRow(3)
  headerRow.values = COLUMN_HEADERS
  headerRow.font = { bold: true }
  headerRow.eachCell((cell) => (cell.fill = HEADER_FILL))

  for (const ticket of tickets) {
    ticketsSheet.addRow([
      ticket.title,
      ticket.category?.name ?? '—',
      PRIORITY_LABELS[ticket.priority] ?? ticket.priority,
      STATUS_LABELS[ticket.status] ?? ticket.status,
      ticket.requester?.name ?? '—',
      ticket.assignee?.name ?? '—',
      ticket.createdAt.setZone('America/Sao_Paulo').toFormat('dd/MM/yyyy HH:mm'),
    ])
  }

  COLUMN_WIDTHS.forEach((width, index) => {
    ticketsSheet.getColumn(index + 1).width = width
  })

  const summarySheet = workbook.addWorksheet('Resumo')

  summarySheet.mergeCells(1, 1, 1, 3)
  const summaryTitleCell = summarySheet.getCell(1, 1)
  summaryTitleCell.value = 'Resumo por status'
  summaryTitleCell.font = { bold: true, size: 14 }

  const summaryHeaderRow = summarySheet.getRow(2)
  summaryHeaderRow.values = ['Status', 'Quantidade', 'Percentual']
  summaryHeaderRow.font = { bold: true }
  summaryHeaderRow.eachCell((cell) => (cell.fill = HEADER_FILL))

  for (const entry of stats.statuses) {
    summarySheet.addRow([
      STATUS_LABELS[entry.status] ?? entry.status,
      entry.count,
      `${entry.percentage.toLocaleString('pt-BR')}%`,
    ])
  }

  const totalRow = summarySheet.addRow(['Total', stats.total, '100%'])
  totalRow.font = { bold: true }

  summarySheet.columns = [{ width: 20 }, { width: 14 }, { width: 14 }]

  return workbook.xlsx.writeBuffer()
}
