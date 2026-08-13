import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Marks a route as exempt from the global TransformInterceptor, which
 * wraps every response in `{ data: ... }`. That wrapping is fine (expected,
 * even — see api.ts's `json?.data ?? json` unwrap) for normal JSON
 * responses, but it corrupts a `@Sse()` route: each emitted MessageEvent
 * (`{ type, data }`) gets re-wrapped as `{ data: { type, data } }`, which
 * loses the top-level `type` Nest's SSE writer needs to send a named
 * `event: notification` line — so the browser's
 * `addEventListener('notification', ...)` never fires and the client
 * silently falls back to (much slower) polling.
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);