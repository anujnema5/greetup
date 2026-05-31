"use client";

import type { ReactNode } from "react";
import { Compass, Shield, ShieldBan } from "lucide-react";

import { PageHeader } from "@/features/app-shell";
import { AppShellLayout } from "@/features/app-shell/components/app-shell-layout";
import { BlockedUsersSettingsSection } from "@/features/blocks";
import { FirebasePhoneAuthProvider } from "@/features/auth/context/firebase-phone-auth-context";
import { PhoneNumberSettingsCard } from "@/features/settings/components/phone-number-settings-card";
import { ReplayTourSettingsCard } from "@/features/tour-guide";
import { APP_ROUTES } from "@/lib/routing/app-routes";

/** ~320px tile — matches a 3-column settings row, left-aligned. */
const SETTINGS_TILE_CLASS = "min-w-0 w-full max-w-[20rem]";

function SettingsSection({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: typeof Shield;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function SettingsPage() {
  return (
    <AppShellLayout activePath={APP_ROUTES.settings}>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <PageHeader
          title="Settings"
          subtitle="Security, privacy, and account preferences."
        />

        <div className="w-full px-4 py-5 md:px-8 md:py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,20rem)] xl:justify-start">
            <SettingsSection icon={Shield} title="Security" className={SETTINGS_TILE_CLASS}>
              <FirebasePhoneAuthProvider>
                <PhoneNumberSettingsCard />
              </FirebasePhoneAuthProvider>
            </SettingsSection>

            <SettingsSection icon={ShieldBan} title="Privacy" className={SETTINGS_TILE_CLASS}>
              <BlockedUsersSettingsSection />
            </SettingsSection>

            <SettingsSection icon={Compass} title="Help" className={SETTINGS_TILE_CLASS}>
              <ReplayTourSettingsCard />
            </SettingsSection>
          </div>
        </div>
      </main>
    </AppShellLayout>
  );
}
