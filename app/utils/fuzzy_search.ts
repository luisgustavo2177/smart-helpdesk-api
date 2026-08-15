/**
 * Utilitários de busca fuzzy para Lucid query builders.
 *
 * Requer as extensões PostgreSQL `pg_trgm` e `unaccent` habilitadas.
 * Ver migration: create_fuzzy_search_extensions.
 *
 * Estratégias combinadas em applyFuzzyTerm:
 *   1. unaccent_immutable + ILIKE por palavra — busca parcial sem acento,
 *      com suporte a múltiplas palavras em qualquer ordem.
 *      "joao silva" → "João Silva"  |  "silva jo" → "João Silva"
 *   2. word_similarity > 0.2 — tolerância a erros de digitação.
 *      "joao sliva" → "João Silva"
 *
 * Uso em applySearch (BaseService):
 *   builder.orWhere((sub) => applyFuzzyTerm(sub, 'table.column', term))
 *
 * Uso em applyFilters (BaseService) — sem similarity para evitar falsos positivos:
 *   applyAccentFilter(query, 'column_name', value)
 *
 * Uso para ranking por relevância em services customizados:
 *   applyFuzzyOrderBy(query, 'table.column', term)
 */

const SIMILARITY_THRESHOLD = 0.2

/**
 * Aplica busca fuzzy num sub-builder agrupado (usar dentro de orWhere/where callbacks).
 *
 * @param builder   Sub-builder recebido num callback where/orWhere
 * @param columnExpr  Expressão de coluna — qualificada "table.col" ou simples "col"
 * @param term      Termo de busca do usuário
 */
export function applyFuzzyTerm(builder: any, columnExpr: string, term: string): void {
  const safeCol = columnExpr.replace(/[^a-zA-Z0-9_."]/g, '')
  const normalized = `unaccent_immutable(lower(CAST(${safeCol} AS TEXT)))`
  const words = term.trim().split(/\s+/).filter(Boolean)

  if (words.length === 1) {
    builder
      .whereRaw(`${normalized} ILIKE unaccent_immutable(lower(?))`, [`%${term}%`])
      .orWhereRaw(`word_similarity(unaccent_immutable(lower(?)), ${normalized}) > ?`, [
        term,
        SIMILARITY_THRESHOLD,
      ])
  } else {
    // Todas as palavras devem aparecer em qualquer ordem (AND implícito)
    builder
      .where((wordSub: any) => {
        words.forEach((word) => {
          wordSub.whereRaw(`${normalized} ILIKE unaccent_immutable(lower(?))`, [`%${word}%`])
        })
      })
      // Fallback: similaridade geral captura erros de digitação
      .orWhereRaw(`word_similarity(unaccent_immutable(lower(?)), ${normalized}) > ?`, [
        term,
        SIMILARITY_THRESHOLD,
      ])
  }
}

/**
 * Aplica filtro accent-insensitive sem trigram (usar em applyFilters).
 * Evita falsos positivos que similarity causaria em filtros de precisão.
 *
 * @param query       Query builder principal
 * @param columnName  Nome da coluna sem prefixo de tabela
 * @param value       Valor do filtro
 */
export function applyAccentFilter(query: any, columnName: string, value: string): void {
  const safeCol = columnName.replace(/[^a-zA-Z0-9_.]/g, '')
  query.whereRaw(
    `unaccent_immutable(lower(CAST(${safeCol} AS TEXT))) ILIKE unaccent_immutable(lower(?))`,
    [`%${value}%`]
  )
}

/**
 * Normaliza string para busca in-memory (JS) espelhando unaccent_immutable(lower(...)).
 * Usar quando a busca ocorre sobre arrays em memória em vez de queries SQL.
 *
 * @example
 *   const term = normalizeForSearch(rawTerm)
 *   items.filter(i => normalizeForSearch(i.name ?? '').includes(term))
 */
export function normalizeForSearch(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Adiciona ORDER BY por relevância de busca fuzzy.
 * Chamar no service após applySearch quando ranking por similaridade é desejado.
 *
 * @param query       Query builder principal
 * @param columnExpr  Expressão de coluna — qualificada "table.col" ou simples "col"
 * @param term        Mesmo termo passado para applyFuzzyTerm
 */
export function applyFuzzyOrderBy(query: any, columnExpr: string, term: string): void {
  const safeCol = columnExpr.replace(/[^a-zA-Z0-9_."]/g, '')
  query.orderByRaw(
    `word_similarity(unaccent_immutable(lower(?)), unaccent_immutable(lower(CAST(${safeCol} AS TEXT)))) DESC`,
    [term]
  )
}
