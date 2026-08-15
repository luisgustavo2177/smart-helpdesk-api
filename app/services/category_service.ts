import Category from '#models/category'
import CategoryValidator from '#validators/category_validator'
import { BaseService } from './base_service.js'

export default class CategoryService extends BaseService<typeof Category, CategoryValidator> {
  constructor() {
    super(Category, new CategoryValidator())
  }
}
