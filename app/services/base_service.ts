import { type LucidModel, type ModelAttributes } from '@adonisjs/lucid/types/model'
import { type RelationSubQueryBuilderContract } from '@adonisjs/lucid/types/relations'
import { type TransactionClientContract } from '@adonisjs/lucid/types/database'
import { type z } from 'zod'
import { type BaseModel } from '#models/base_model'
import { type BaseValidator } from '#validators/base_validator'
import { camelToSnakeCase } from '#utils/transform_strings'
import { applyAccentFilter, applyFuzzyTerm } from '#utils/fuzzy_search'
import { AppError } from '#error/app_error'
import type { HttpContext } from '@adonisjs/core/http'

export type PreloadConfig = {
  relation: string
  fields: string[]
  nested?: PreloadConfig[]
}

export type PreloadQuery = {
  select: (...fields: string[]) => unknown
  preload: (relation: never, callback: (q: PreloadQuery) => void) => unknown
}

export type StoreServiceProps<T extends typeof BaseModel> = {
  data: Partial<ModelAttributes<InstanceType<T>>>
  transaction?: TransactionClientContract
  ctx?: HttpContext
}

export type UpdateServiceProps<T extends typeof BaseModel> = StoreServiceProps<T> & {
  id: number
}

export type ShowServiceProps = {
  id: number
  ctx?: HttpContext
  transaction?: TransactionClientContract
}

export type IndexProps<T extends typeof BaseModel> = {
  page?: number
  limit?: number
  filters?: Partial<ModelAttributes<InstanceType<T>>>
  order?: string
  search?: string
  ctx?: HttpContext
}

export type DestroyServiceProps = {
  id: number
  ctx?: HttpContext
}

export type RelationSearchConfig = {
  relation: string
  columns: string[]
}

export type RelationOrderConfig = {
  field: string
  table: string
  column: string
  foreignKey: string
  joinType?: 'inner' | 'left'
}

export abstract class BaseService<
  T extends typeof BaseModel,
  V extends BaseValidator<z.ZodRawShape>,
> {
  protected indexPreloads: PreloadConfig[] = []
  protected relationSearchFields: RelationSearchConfig[] = []
  protected relationOrderFields: RelationOrderConfig[] = []
  protected defaultOrder: string = 'id'

  constructor(
    protected model: T,
    protected validator: V
  ) {}

  getEntityName() {
    return this.model.entityName || this.model.name
  }

  protected applyFilters(
    query: ReturnType<T['query']>,
    filters?: Partial<ModelAttributes<InstanceType<T>>>
  ): void {
    if (!filters) return

    for (const filter in filters) {
      if (!this.model.$hasColumn(filter)) {
        throw new AppError({
          messages: [`O campo ${filter} não existe`],
          statusCode: 400,
        })
      }

      const columnName = camelToSnakeCase(filter)
      const filterValue = (filters as Record<string, unknown>)[filter]
      const rawValue: unknown = filterValue

      const columnDef = this.model.$columnsDefinitions.get(columnName)
      const isDateColumn = columnDef?.meta?.type === 'date' || columnDef?.meta?.type === 'dateTime'
      const isBooleanValue =
        typeof filterValue === 'boolean' || filterValue === 'true' || filterValue === 'false'

      if (Array.isArray(rawValue) && rawValue.length > 0) {
        const allNumeric = rawValue.every((v) => !Number.isNaN(Number(v)))
        query.whereIn(columnName, allNumeric ? rawValue.map(Number) : (rawValue as string[]))
      } else if (
        typeof rawValue === 'string' &&
        rawValue.includes(',') &&
        rawValue.split(',').every((v) => !Number.isNaN(Number(v.trim())))
      ) {
        query.whereIn(
          columnName,
          rawValue.split(',').map((v) => Number(v.trim()))
        )
      } else if (isDateColumn) {
        query.where(columnName, '=', filterValue as string)
      } else if (isBooleanValue) {
        const boolValue = filterValue === 'true' || filterValue === true
        query.where(columnName, '=', boolValue)
      } else if (!Number.isNaN(Number(filterValue)) && String(filterValue).trim() !== '') {
        query.where(columnName, '=', Number(filterValue))
      } else {
        applyAccentFilter(query, columnName, String(filterValue))
      }
    }
  }

  protected applySearch(query: ReturnType<T['query']>, search?: string): void {
    if (!search) return

    const searchTerm = String(search).trim()
    if (searchTerm.length < 2) return

    const columns = this.model.$columnsDefinitions
    const excludedColumns = ['id', 'created_at', 'updated_at', 'deleted_at', 'uuid', 'synced_at']

    query.where((builder) => {
      columns.forEach((column) => {
        const columnName = column.columnName
        if (columnName && !excludedColumns.includes(columnName) && !columnName.endsWith('_id')) {
          builder.orWhere((colSub) => {
            applyFuzzyTerm(colSub, `${this.model.table}.${columnName}`, searchTerm)
          })
        }
      })

      for (const { relation, columns: relationColumns } of this.relationSearchFields) {
        const parts = relation.split('.')

        const buildNested = (
          q: RelationSubQueryBuilderContract<LucidModel>,
          remaining: string[]
        ) => {
          if (remaining.length === 0) {
            q.where((sub) => {
              relationColumns.forEach((col) => {
                sub.orWhere((colSub) => {
                  applyFuzzyTerm(colSub, col, searchTerm)
                })
              })
            })
          } else {
            q.whereHas(
              remaining[0] as never,
              (inner: RelationSubQueryBuilderContract<LucidModel>) => {
                buildNested(inner, remaining.slice(1))
              }
            )
          }
        }

        builder.orWhereHas(
          parts[0] as never,
          (relationQuery: RelationSubQueryBuilderContract<LucidModel>) => {
            buildNested(relationQuery, parts.slice(1))
          }
        )
      }
    })
  }

  protected applyOrder(query: ReturnType<T['query']>, order?: string): void {
    if (order) {
      const isDescending = order.startsWith('-')
      const fieldName = isDescending ? order.substring(1) : order
      const direction = isDescending ? 'desc' : 'asc'

      const relationOrder = this.relationOrderFields.find((r) => r.field === fieldName)
      if (relationOrder) {
        const joinFn = relationOrder.joinType === 'left' ? 'leftJoin' : 'join'
        query[joinFn](
          relationOrder.table,
          `${this.model.table}.${relationOrder.foreignKey}`,
          `${relationOrder.table}.id`
        )
        query.select(`${this.model.table}.*`)
        query.orderBy(`${relationOrder.table}.${relationOrder.column}`, direction)
        return
      }

      if (!this.model.$hasColumn(fieldName)) {
        throw new AppError({
          messages: [`O campo ${fieldName} não existe para ordenação`],
          statusCode: 400,
        })
      }

      const columnName = camelToSnakeCase(fieldName)
      query.orderBy(columnName, direction)
    } else {
      this.applyOrder(query, this.defaultOrder)
    }
  }

  async index({ page = 1, limit, filters, order, search }: IndexProps<T>) {
    const query = this.model.query()

    const applyPreloads = (q: any, preloads: PreloadConfig[]) => {
      for (const preload of preloads) {
        q.preload(preload.relation as never, (preloadQuery: any) => {
          preloadQuery.select(...preload.fields)
          if (preload.nested) {
            applyPreloads(preloadQuery, preload.nested)
          }
        })
      }
    }

    applyPreloads(query, this.indexPreloads)

    this.applyFilters(query as ReturnType<T['query']>, filters)
    this.applySearch(query as ReturnType<T['query']>, search)
    this.applyOrder(query as ReturnType<T['query']>, order)

    return await query.paginate(page, limit)
  }

  async filterOptions(select: string[], orderBy: string, orderDirection: 'asc' | 'desc' = 'asc') {
    return await this.model
      .query()
      .select(...select)
      .distinct(...select)
      .orderBy(orderBy, orderDirection)
      .pojo()
  }

  async store({ data, transaction }: StoreServiceProps<T>) {
    try {
      const validatedData = this.validator.validateCreate(data)
      const newEntity = new this.model() as InstanceType<T>

      newEntity.merge(validatedData as Partial<ModelAttributes<InstanceType<T>>>)

      if (transaction) {
        newEntity.useTransaction(transaction)
      }

      await newEntity.save()

      return newEntity
    } catch (error) {
      if (!(
        error instanceof Error &&
        (error.message.includes('duplicate key value violates unique constraint') ||
          error.message.includes('violates foreign key constraint'))
      )) {
        console.error('Erro no service store:', error)
      }

      throw error
    }
  }

  async update({ id, data, transaction }: UpdateServiceProps<T>) {
    try {
      const foundEntity = await this.model.find(id, { client: transaction })
      if (!foundEntity) {
        throw new AppError({
          messages: [`${this.getEntityName()} não encontrado(a)`],
          statusCode: 404,
        })
      }

      const validatedData = this.validator.validateUpdate(data)

      foundEntity.merge(validatedData as Partial<ModelAttributes<InstanceType<T>>>)
      if (transaction) foundEntity.useTransaction(transaction)
      await foundEntity.save()

      return foundEntity
    } catch (error) {
      if (!(
        error instanceof Error &&
        (error.message.includes('duplicate key value violates unique constraint') ||
          error.message.includes('violates foreign key constraint'))
      )) {
        console.error('Erro no service update:', error)
      }

      throw error
    }
  }

  async show({ id, transaction }: ShowServiceProps) {
    const foundEntity = await this.model.find(id, { client: transaction })
    if (!foundEntity) {
      throw new AppError({
        messages: [`${this.getEntityName()} não encontrado(a)`],
        statusCode: 404,
      })
    }
    return foundEntity
  }

  async showWithRelations({ id, relations }: { id: number; relations: string[] }) {
    let query = this.model.query().where('id', id)
    relations.forEach((relation) => {
      query = query.preload(relation as never)
    })

    const foundEntity = await query.first()
    if (!foundEntity) {
      throw new AppError({
        messages: [`${this.getEntityName()} não encontrado(a)`],
        statusCode: 404,
      })
    }
    return foundEntity
  }

  async destroy({ id }: DestroyServiceProps) {
    const foundEntity = await this.model.find(id)
    if (!foundEntity) {
      throw new AppError({
        messages: [`${this.getEntityName()} não encontrado(a)`],
        statusCode: 404,
      })
    }

    await foundEntity.delete()

    return foundEntity
  }
}
