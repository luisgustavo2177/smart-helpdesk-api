import router from '@adonisjs/core/services/router'
import authRouter from './auth_router.js'
import userRouter from './user_router.js'

// Rota de teste
router.get('/', async () => {
  return {
    hello: 'Smart Helpdesk API',
    version: '1.0.0',
  }
})

// Agrupando todas as rotas da API
router
  .group(() => {
    router.group(authRouter)
    router.group(userRouter)

    // Chamados, comentários e indicadores entram aqui nas próximas etapas.
  })
  .prefix('/api/v1')
