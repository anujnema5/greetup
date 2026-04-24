"use client";

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
          <section className="rounded-2xl border border-border bg-card p-6">
            <h1 className="text-lg font-semibold text-foreground">Settings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Account security and preferences. Profile details are on your profile page.
            </p>
          </section>

          <div className="mt-6 max-w-lg space-y-6">
            <FirebasePhoneAuthProvider>
              <PhoneNumberSettingsCard />
            </FirebasePhoneAuthProvider>
          </div>
        </div>
      </main>

      <BottomNav activePath="/settings" />
    </div>
  );
}
