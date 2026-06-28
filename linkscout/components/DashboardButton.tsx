"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardButton() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (!user) return null;

  return (
    <a
      href="/dashboard"
      className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors duration-150 shadow-sm shadow-brand/20"
    >
      Dashboard
    </a>
  );
}
