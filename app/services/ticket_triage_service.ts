import Category from '#models/category'
import { AppError } from '#error/app_error'
import { normalizeForSearch } from '#utils/fuzzy_search'
import { GeminiClassificationService } from '#services/gemini_classification_service'

export type TriageResult = {
  categoryId: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

/**
 * Triagem automática: tenta o Gemini (API gratuita) primeiro; se não houver
 * chave configurada ou a chamada falhar por qualquer motivo (rate limit,
 * timeout, rede, resposta fora do formato), cai para a heurística local por
 * palavras-chave — determinística, sem custo e sem dependência externa. Ver
 * README para a justificativa completa da abordagem.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Rede: ['rede', 'internet', 'wifi', 'wi-fi', 'conexao', 'roteador', 'vpn', 'sinal'],
  Hardware: [
    'impressora',
    'computador',
    'notebook',
    'mouse',
    'teclado',
    'monitor',
    'cabo',
    'usb',
    'periferico',
  ],
  Software: [
    'sistema',
    'programa',
    'aplicativo',
    'planilha',
    'login',
    'travando',
    'travou',
    'atualizacao',
    'arquivo',
  ],
  Acesso: ['acesso', 'permissao', 'usuario', 'perfil', 'liberacao', 'cadastro'],
}

const HIGH_PRIORITY_KEYWORDS = [
  'urgente',
  'critic', // crítico/crítica
  'parad', // parado/parada
  'parou',
  'fora do ar',
  'nao funciona',
  'todos os',
  'producao',
  'imediato',
]

const MEDIUM_PRIORITY_KEYWORDS = [
  'lent', // lento/lenta/lentidão
  'intermitente',
  'as vezes',
  'alguns',
  'ocasionalmente',
]

export class TicketTriageService {
  static async classify(description: string): Promise<TriageResult> {
    const activeCategories = await Category.query().where('status', true)
    if (activeCategories.length === 0) {
      throw new AppError({
        messages: ['Nenhuma categoria ativa cadastrada para classificar o chamado.'],
        statusCode: 500,
      })
    }

    const categoryNames = activeCategories.map((category) => category.name)
    const geminiResult = await GeminiClassificationService.classify(description, categoryNames)

    if (geminiResult) {
      const category = activeCategories.find((c) => c.name === geminiResult.categoryName)
      if (category) {
        return { categoryId: category.id, priority: geminiResult.priority }
      }
    } else {
      console.warn('[TicketTriageService] Gemini indisponível, usando heurística de fallback.')
    }

    return this.classifyHeuristically(description, activeCategories)
  }

  private static classifyHeuristically(
    description: string,
    activeCategories: Category[]
  ): TriageResult {
    const text = normalizeForSearch(description)

    const categoryName = this.matchCategory(text)
    const category =
      activeCategories.find((c) => c.name === categoryName) ??
      activeCategories.find((c) => c.name === 'Outros') ??
      activeCategories[0]

    return {
      categoryId: category.id,
      priority: this.matchPriority(text),
    }
  }

  private static matchCategory(text: string): string {
    for (const [name, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return name
      }
    }
    return 'Outros'
  }

  private static matchPriority(text: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (HIGH_PRIORITY_KEYWORDS.some((keyword) => text.includes(keyword))) return 'HIGH'
    if (MEDIUM_PRIORITY_KEYWORDS.some((keyword) => text.includes(keyword))) return 'MEDIUM'
    return 'LOW'
  }
}
