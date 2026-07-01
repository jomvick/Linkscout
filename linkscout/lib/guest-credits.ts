const CREDITS_KEY = "linkscout_guest_credits";
const INITIAL_CREDITS = 5;

export const GuestCredits = {
  remaining(): number {
    if (typeof window === "undefined") return INITIAL_CREDITS;
    try {
      const raw = localStorage.getItem(CREDITS_KEY);
      if (raw === null) return INITIAL_CREDITS;
      const val = parseInt(raw, 10);
      return isNaN(val) ? INITIAL_CREDITS : val;
    } catch {
      return INITIAL_CREDITS;
    }
  },

  consume(): number {
    const current = GuestCredits.remaining();
    const next = Math.max(0, current - 1);
    try {
      localStorage.setItem(CREDITS_KEY, String(next));
    } catch {
      // ignore
    }
    return next;
  },

  reset() {
    try {
      localStorage.setItem(CREDITS_KEY, String(INITIAL_CREDITS));
    } catch {
      // ignore
    }
  },
};
