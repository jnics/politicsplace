import { createContext } from "react-router";

/**
 * React Router v8's context system (a typed `RouterContext`, read via
 * `context.get(cloudflareContext)` in any loader/action) — not the plain
 * `AppLoadContext` object-merge v7 used. Populated once, in workers/app.ts,
 * from the real Worker `fetch(request, env, ctx)` arguments.
 */
export const cloudflareContext = createContext<{ env: Env; ctx: ExecutionContext }>();
