import type { Pool } from "pg";
import { getStationBilledPrices } from "../../actuals/stations.js";
import { problemResponse } from "../problem.js";

/** `GET /stations/{id}/billed-prices` — A8.9's price history and A6.5's audit
 * hook. `id` is `stations.id`; an id that names no station (or isn't a uuid) is a 404. */
export async function handleGetStationBilledPrices(pool: Pool, id: string, url: URL): Promise<Response> {
  const result = await getStationBilledPrices(pool, id);
  if (!result) {
    return problemResponse({
      title: "Not Found",
      status: 404,
      detail: `No station with id ${id}`,
      instance: url.pathname,
    });
  }
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
