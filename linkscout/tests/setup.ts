import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ── Nettoyage automatique après chaque test ──────────────────────────
afterEach(() => {
  cleanup();
});

// ── Mock fetch global ────────────────────────────────────────────────
// AVERTISSEMENT: Ne PAS remplacer globalThis.fetch ici.
// Chaque test doit configurer ses propres mocks via vi.spyOn ou MSW.
// Sinon, les appels fetch non mockés seront silencieusement avalés.

// ── MSW Integration (optionnel) ──────────────────────────────────────
// Pour activer MSW, install msw et décommenter:
//
// import { server } from "../mocks/server";
//
// beforeAll(() => {
//   server.listen({ onUnhandledRequest: "warn" });
// });
//
// afterEach(() => {
//   server.resetHandlers();
// });
//
// afterAll(() => {
//   server.close();
// });

// ── Mock next/navigation ─────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useParams: () => ({}),
}));

// ── Mock window.matchMedia pour framer-motion ─────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Mock localStorage ────────────────────────────────────────────────
const storage = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get length() {
      return storage.size;
    },
    key: vi.fn((index: number) => [...storage.keys()][index] ?? null),
  },
});
