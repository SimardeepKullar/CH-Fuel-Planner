import type { Pool } from "pg";
import { z } from "zod";
import { getTruckDetail, listTrucks } from "../../actuals/trucks.js";
import { problemResponse } from "../problem.js";

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "period must be a YYYY-MM-DD date"),
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** `GET /trucks?period=` — A8.8's list. */
export async function handleListTrucks(pool: Pool, url: URL): Promise<Response> {
  const parsed = querySchema.safeParse({ period: url.searchParams.get("period") });
  if (!parsed.success) {
    return problemResponse({ title: "Bad Request", status: 400, detail: parsed.error.message, instance: url.pathname });
  }
  return jsonResponse(await listTrucks(pool, parsed.data.period));
}

/** `GET /trucks/{id}?period=` — A8.8's detail, with the assignment history. */
export async function handleGetTruck(pool: Pool, id: string, url: URL): Promise<Response> {
  const parsed = querySchema.safeParse({ period: url.searchParams.get("period") });
  if (!parsed.success) {
    return problemResponse({ title: "Bad Request", status: 400, detail: parsed.error.message, instance: url.pathname });
  }

  const detail = await getTruckDetail(pool, id, parsed.data.period);
  if (!detail) {
    return problemResponse({
      title: "Not Found",
      status: 404,
      detail: `No truck with id ${id}`,
      instance: url.pathname,
    });
  }
  return jsonResponse(detail);
}
