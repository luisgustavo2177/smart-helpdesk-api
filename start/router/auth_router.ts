const AuthController = () => import('#controllers/auth_controller')
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

export default function authRouter() {
  router
    .group(() => {
      router.post('register', [AuthController, 'register'])
      router.post('login', [AuthController, 'login'])
      router.get('me', [AuthController, 'me']).use([middleware.auth()])
    })
    .prefix('/auth')
}
