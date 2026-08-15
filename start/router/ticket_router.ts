const TicketController = () => import('#controllers/ticket_controller')
const CommentController = () => import('#controllers/comment_controller')
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

export default function ticketRouter() {
  router
    .group(() => {
      router
        .resource('tickets', TicketController)
        .only(['index', 'store', 'show', 'update', 'destroy'])

      router.get('tickets/:ticketId/comments', [CommentController, 'index'])
      router.post('tickets/:ticketId/comments', [CommentController, 'store'])
    })
    .use([middleware.auth()])
}
