import z from 'zod'

export const HELPDESK_EMAIL_DOMAIN = '@helpdesk.com'

export const helpdeskEmailSchema = z
  .string({ message: 'O e-mail é obrigatório' })
  .email('E-mail inválido')
  .refine((email) => email.toLowerCase().endsWith(HELPDESK_EMAIL_DOMAIN), {
    message: `O e-mail deve ser do domínio ${HELPDESK_EMAIL_DOMAIN}`,
  })
