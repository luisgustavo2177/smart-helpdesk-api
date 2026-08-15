import router from '@adonisjs/core/services/router'
import authRouter from './auth_router.js'
import userRouter from './user_router.js'
import categoryRouter from './category_router.js'
import ticketRouter from './ticket_router.js'

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
    router.group(categoryRouter)
    router.group(ticketRouter)

    // Indicadores em tempo real entram numa próxima etapa.
  })
  .prefix('/api/v1')
