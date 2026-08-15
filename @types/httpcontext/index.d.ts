import '@adonisjs/core'

/**
 * `BaseService` referencia `ctx.user` (ex.: para stampar `profileId`).
 * O formato final é definido junto com a implementação da autenticação.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    user?: Record<string, any> | null
  }
}
