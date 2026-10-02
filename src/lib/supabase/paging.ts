/** Hosted Supabase caps every response at this many rows. */
export const MAX_ROWS_PER_REQUEST = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Reads a query in 1000-row chunks with `.range()` until it runs dry or `maxRows`
 * is reached. `page(from, to)` must build the query with a stable order.
 * `truncated` is true only when more rows exist beyond `maxRows`.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  { maxRows = 20_000, pageSize = MAX_ROWS_PER_REQUEST }: { maxRows?: number; pageSize?: number } = {},
): Promise<{ rows: T[]; truncated: boolean; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize, maxRows) - 1;
    const { data, error } = await page(from, to);
    if (error) return { rows, truncated: false, error: error.message };
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < to - from + 1) return { rows, truncated: false, error: null };
  }
  // Hit the cap: peek one row further to see whether anything was left out.
  const { data } = await page(maxRows, maxRows);
  return { rows, truncated: (data ?? []).length > 0, error: null };
}
