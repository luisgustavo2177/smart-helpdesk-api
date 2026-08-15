import { BasePolicy } from '@adonisjs/bouncer'
import User from '#models/user'

/**
 * Autorização sobre o recurso `users`: ADMIN enxerga/gerencia qualquer
 * usuário; REQUESTER só enxerga/gerencia o próprio registro.
 */
export default class UserPolicy extends BasePolicy {
  create(actingUser: User): boolean {
    return actingUser.role === 'ADMIN'
  }

  viewList(actingUser: User): boolean {
    return actingUser.role === 'ADMIN'
  }

  view(actingUser: User, targetUser: User): boolean {
    return actingUser.role === 'ADMIN' || actingUser.id === targetUser.id
  }

  update(actingUser: User, targetUser: User): boolean {
    return actingUser.role === 'ADMIN' || actingUser.id === targetUser.id
  }

  delete(actingUser: User, _targetUser: User): boolean {
    return actingUser.role === 'ADMIN'
  }
}
