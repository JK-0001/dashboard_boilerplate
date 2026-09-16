/**
 * fetchAllRows — chunked reads past PostgREST's 1000-row response cap.
 *
 * Supabase silently truncates any select to 1000 rows; a list page built on
 * a plain `.select()` looks complete and isn't. Wrap the query in a builder
 * that applies `.range(from, to)` and this pages until a short chunk:
 *
 *   const rows = await fetchAllRows<Product>((from, to) =>
 *     supabase.from("products").select("*").order("created_at").range(from, to));
 *
 * Prefer server-side filtering long before you're fetching >5k rows.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  chunkSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += chunkSize) {
    const { data, error } = await build(from, from + chunkSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < chunkSize) return all;
  }
}
