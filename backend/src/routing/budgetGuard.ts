import type { Pool } from "pg";

/**
 * Thrown instead of making the call. §8.3: the real risk is a retry loop,
 * not ordinary use — an error that stops the call, not a log line.
 */
export class BudgetExceededError extends Error {
  constructor(
    public readonly provider: string,
    public readonly period: string,
    public readonly ceiling: number,
  ) {
    super(
      `Monthly budget ceiling of ${ceiling} calls exceeded for provider "${provider}" (period ${period})`,
    );
    this.name = "BudgetExceededError";
  }
}

function periodStart(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Ours (§8.3): a monthly ceiling pooled across every endpoint. Reserves the
 * call by incrementing `provider_usage` for `(provider, period, endpoint)`
 * *before* the caller's HTTP request runs, so a call that is reserved and
 * then fails downstream still counts — it consumed quota. The ceiling check
 * sums every endpoint's counter for the period, because a month's budget is
 * pooled, not per-endpoint (that pooling is `provider_quota`'s job instead).
 */
export async function reserveProviderCall(
  pool: Pool,
  provider: string,
  endpoint: string,
  ceilingCalls: number,
  now: Date = new Date(),
): Promise<void> {
  const period = periodStart(now);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(call_count), 0) AS total
       FROM provider_usage
       WHERE provider = $1 AND period = $2`,
      [provider, period],
    );
    const currentTotal = Number(rows[0]?.total ?? 0);

    if (currentTotal + 1 > ceilingCalls) {
      throw new BudgetExceededError(provider, period, ceilingCalls);
    }

    await client.query(
      `INSERT INTO provider_usage (provider, period, endpoint, call_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (provider, period, endpoint)
       DO UPDATE SET call_count = provider_usage.call_count + 1`,
      [provider, period, endpoint],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Reserves quota, then runs `fn`. The reservation is not rolled back if
 * `fn` throws — a reserved-then-failed call still consumed the quota it
 * reserved.
 */
export async function withBudgetGuard<T>(
  pool: Pool,
  provider: string,
  endpoint: string,
  ceilingCalls: number,
  fn: () => Promise<T>,
  now: Date = new Date(),
): Promise<T> {
  await reserveProviderCall(pool, provider, endpoint, ceilingCalls, now);
  return fn();
}
