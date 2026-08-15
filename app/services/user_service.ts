import User from '#models/user'
import UserValidator from '#validators/user_validator'
import { BaseService } from './base_service.js'

export default class UserService extends BaseService<typeof User, UserValidator> {
  constructor() {
    super(User, new UserValidator())
  }
}
