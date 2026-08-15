const CategoryController = () => import('#controllers/category_controller')
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

export default function categoryRouter() {
  router
    .group(() => {
      router
        .resource('categories', CategoryController)
        .only(['index', 'store', 'show', 'update', 'destroy'])
    })
    .use([middleware.auth()])
}
