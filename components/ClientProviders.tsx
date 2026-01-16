"use client";

import type { ReactNode } from "react";
import DialogProvider from "./DialogProvider";
import OtpSignInProvider from "./OtpSignInProvider";
import AuthProvider from "./AuthProvider";
import UserSettingsProvider from "./UserSettingsProvider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <DialogProvider>
          <OtpSignInProvider>{children}</OtpSignInProvider>
        </DialogProvider>
      </UserSettingsProvider>
    </AuthProvider>
  );
}

