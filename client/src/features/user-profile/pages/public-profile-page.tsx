"use client";

import { PageHeader } from "@/features/app-shell";
import { PublicProfileContent } from "../components/public-profile-content";

type Props = {
  username: string;
};

export function PublicProfilePage({ username }: Props) {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
      <PageHeader
        title="Profile"
        subtitle={`@${username}`}
        backHref="/explore"
        backLabel="Back to explore"
      />

      <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-5 px-4 py-6 md:max-w-xl md:px-8">
        <PublicProfileContent username={username} />
      </div>
    </main>
  );
}
