import { BasePolicy } from '@adonisjs/bouncer'
import User from '#models/user'

/** Listar/ver categorias é liberado para qualquer autenticado; só ADMIN gerencia. */
export default class CategoryPolicy extends BasePolicy {
  manage(actingUser: User): boolean {
    return actingUser.role === 'ADMIN'
  }
}
