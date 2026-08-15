export const policies = {
  UserPolicy: () => import('#policies/user_policy'),
  TicketPolicy: () => import('#policies/ticket_policy'),
  CategoryPolicy: () => import('#policies/category_policy'),
}
