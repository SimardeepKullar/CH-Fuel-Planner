import { createApp } from "@ch/core/api/app";

// A thin adapter over backend/src/api's framework-free route table (§13).
// No business logic lives here — it only translates a Next `Request` into
// the app's `handle()` and returns the `Response` it gives back.
const app = createApp();

function handle(request: Request): Promise<Response> {
  return app.handle(request);
}

export {
  handle as DELETE,
  handle as GET,
  handle as PATCH,
  handle as POST,
  handle as PUT,
};
