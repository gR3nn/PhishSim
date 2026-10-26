type SharedResource = { id: string; user_id: string; is_default?: boolean; source_template_id?: string | null }

export function resolveUserLibrary<T extends SharedResource>(rows: T[], userId: string): T[] {
  const visible = rows.filter((row) => row.is_default || row.user_id === userId)
  const overrides = new Map(visible.filter((row) => row.source_template_id && row.user_id === userId).map((row) => [row.source_template_id as string, row]))
  return visible
    .filter((row) => !row.source_template_id && (row.is_default || row.user_id === userId))
    .map((row) => overrides.get(row.id) || row)
}
