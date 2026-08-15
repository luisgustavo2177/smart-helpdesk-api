import router from '@adonisjs/core/services/router'

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
    // Autenticação e demais rotas de domínio (chamados, comentários, indicadores)
    // entram aqui nas próximas etapas.
  })
  .prefix('/api/v1')
