import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW Server — LinkScout
 *
 * Serveur MSW complet pour les tests Node (Vitest).
 * Intercepte toutes les requêtes HTTP sortantes pendant les tests.
 *
 * Usage dans setup.ts:
 *   import { server } from "./mocks/server";
 *   beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 */
export const server = setupServer(...handlers);
