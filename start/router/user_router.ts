const UserController = () => import('#controllers/user_controller')
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

export default function userRouter() {
  router
    .group(() => {
      router.resource('users', UserController).only(['index', 'store', 'show', 'update', 'destroy'])
    })
    .use([middleware.auth()])
}
