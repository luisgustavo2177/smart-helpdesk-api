import env from '#start/env'

export type GeminiTriageResult = {
  categoryName: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

const GEMINI_MODEL = 'gemini-3.6-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const REQUEST_TIMEOUT_MS = 6000

/**
 * Chamada real à API gratuita do Gemini para a triagem do chamado. Retorna
 * `null` em qualquer falha (sem chave configurada, timeout, erro de rede,
 * resposta fora do formato esperado) — quem chama (`TicketTriageService`)
 * cai para a heurística local nesse caso, então uma instabilidade do Gemini
 * nunca impede a criação de um chamado.
 */
export class GeminiClassificationService {
  static async classify(
    description: string,
    categoryNames: string[]
  ): Promise<GeminiTriageResult | null> {
    const apiKey = env.get('GEMINI_API_KEY')
    if (!apiKey) return null

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'Você é um classificador de chamados de central de suporte técnico interno. ' +
                    `Escolha a categoria mais adequada dentre exatamente estas opções: ${categoryNames.join(', ')}. ` +
                    'Defina a prioridade como LOW, MEDIUM ou HIGH considerando o impacto e a urgência ' +
                    'descritos (ex.: sistema fora do ar ou afetando vários usuários é HIGH; lentidão ou ' +
                    'problema intermitente é MEDIUM; o resto é LOW).\n\n' +
                    `Descrição do chamado: """${description}"""`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                category: { type: 'STRING', enum: categoryNames },
                priority: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] },
              },
              required: ['category', 'priority'],
            },
          },
        }),
      })

      if (!response.ok) {
        console.error(
          '[GeminiClassificationService] resposta não-OK:',
          response.status,
          await response.text()
        )
        return null
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }

      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) return null

      const parsed = JSON.parse(text) as { category?: string; priority?: string }

      if (
        !parsed.category ||
        !categoryNames.includes(parsed.category) ||
        !parsed.priority ||
        !['LOW', 'MEDIUM', 'HIGH'].includes(parsed.priority)
      ) {
        console.error('[GeminiClassificationService] resposta fora do formato esperado:', parsed)
        return null
      }

      return {
        categoryName: parsed.category,
        priority: parsed.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      }
    } catch (error) {
      console.error('[GeminiClassificationService] falhou, caindo para heurística:', error)
      return null
    } finally {
      clearTimeout(timeout)
    }
  }
}
