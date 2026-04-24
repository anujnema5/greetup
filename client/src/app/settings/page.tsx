"use client";

import { Shield } from "lucide-react";

import { BottomNav, NavSidebar } from "@/features/app-shell";
import { FirebasePhoneAuthProvider } from "@/features/auth/context/firebase-phone-auth-context";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { PhoneNumberSettingsCard } from "@/features/settings/components/phone-number-settings-card";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/settings" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <DashboardHeader />

        <div className="px-4 py-5 md:px-8">
          {/* <div className="mb-6 border-b border-border pb-4">
            <h1 className="text-[15px] font-semibold leading-none text-foreground">Settings</h1>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Account security and preferences.
            </p>
          </div> */}

          <div className="max-w-lg space-y-5">
            <section>
              <div className="mb-2 flex items-center gap-1.5 px-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Security
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                <FirebasePhoneAuthProvider>
                  <PhoneNumberSettingsCard />
                </FirebasePhoneAuthProvider>
              </div>
            </section>
          </div>
        </div>
      </main>

      <BottomNav activePath="/settings" />
    </div>
  );
}
