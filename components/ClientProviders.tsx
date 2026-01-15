"use client";

import type { ReactNode } from "react";
import DialogProvider from "./DialogProvider";
import AuthProvider from "./AuthProvider";
import UserSettingsProvider from "./UserSettingsProvider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <DialogProvider>{children}</DialogProvider>
      </UserSettingsProvider>
    </AuthProvider>
  );
}

