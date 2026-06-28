import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * MSW Browser Worker — LinkScout
 *
 * Pour les tests dans le navigateur (Storybook, Playwright).
 * Active le Service Worker MSW pour intercepter les appels réseau côté client.
 *
 * Usage:
 *   if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
 *     const { worker } = await import("../mocks/browser");
 *     await worker.start();
 *   }
 */
export const worker = setupWorker(...handlers);
