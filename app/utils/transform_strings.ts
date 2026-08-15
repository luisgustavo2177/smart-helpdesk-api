export function camelToSnakeCase(str: string): string {
  const replacedString = str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)

  return replacedString
}
