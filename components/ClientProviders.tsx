"use client";

import type { ReactNode } from "react";
import DialogProvider from "./DialogProvider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <DialogProvider>{children}</DialogProvider>;
}

