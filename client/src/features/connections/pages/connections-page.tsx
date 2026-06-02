"use client";

import { useCallback, useEffect } from "react";

import { PageHeader } from "@/features/app-shell";
import { useIsMdUp } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { ConnectionProfileEmptyState, ConnectionProfilePanel } from "../components/connection-profile-panel";
import { CONNECTIONS_LIST_COLUMN_CLASS } from "../lib/connections-layout";
import { useConnectionsPageListLoading } from "../hooks/use-connections-page-list-loading";
import { ProfileConnectionsSection } from "../components/profile-connections-section";
import { useConnectionsProfilePanel } from "../hooks/use-connections-profile-panel";

type ConnectionsListProps = {
  selectedUsername: string | null;
  onSelectProfile?: (username: string) => void;
  onPeerDisconnected: (username: string | null) => void;
  pageListLayout: "centered" | "split";
};

function ConnectionsList({
  selectedUsername,
  onSelectProfile,
  onPeerDisconnected,
  pageListLayout,
}: ConnectionsListProps) {
  return (
    <ProfileConnectionsSection
      variant="page"
      selectedUsername={selectedUsername}
      onSelectProfile={onSelectProfile}
      onPeerDisconnected={onPeerDisconnected}
      pageListLayout={pageListLayout}
    />
  );
}

export function ConnectionsPage() {
  const isDesktop = useIsMdUp();
  const listLoading = useConnectionsPageListLoading();
  const { selectedUsername, panelOpen, openProfile, closeProfile } = useConnectionsProfilePanel();

  const handleSelectProfile = useCallback(
    (username: string) => {
      openProfile(username);
    },
    [openProfile],
  );

  const handlePeerDisconnected = useCallback(
    (username: string | null) => {
      if (username && username === selectedUsername) {
        closeProfile();
      }
    },
    [closeProfile, selectedUsername],
  );

  useEffect(() => {
    if (!panelOpen || !isDesktop) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProfile();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeProfile, isDesktop, panelOpen]);

  const showDesktopSplit = isDesktop;
  const desktopPanelOpen = showDesktopSplit && panelOpen && selectedUsername;

  const listProps = {
    selectedUsername: showDesktopSplit ? selectedUsername : null,
    onSelectProfile: isDesktop ? handleSelectProfile : undefined,
    onPeerDisconnected: handlePeerDisconnected,
    pageListLayout: desktopPanelOpen ? ("split" as const) : ("centered" as const),
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <PageHeader
          title="Connections"
          subtitle="People you're connected with and pending requests."
        />

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-6 md:py-5">
          {desktopPanelOpen ? (
            <div
              className={cn(
                "flex min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-border",
                "bg-card/40 shadow-sm dark:bg-card/25",
              )}
            >
              <aside className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-r border-border px-4 py-4">
                <ConnectionsList {...listProps} />
              </aside>

              <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
                <ConnectionProfilePanel username={selectedUsername} onClose={closeProfile} />
              </section>
            </div>
          ) : (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm",
                "md:flex-row md:items-stretch dark:bg-card/25",
              )}
            >
              <aside
                className={cn(
                  "flex min-h-0 min-w-0 flex-col overflow-y-auto px-1 py-1 md:px-4 md:py-4",
                  CONNECTIONS_LIST_COLUMN_CLASS,
                )}
              >
                <ConnectionsList {...listProps} />
              </aside>

              {!listLoading ? (
                <section
                  className={cn(
                    "hidden min-h-0 min-w-0 flex-1 flex-col md:flex",
                    "bg-muted/25 dark:bg-black/45",
                  )}
                  aria-hidden
                >
                  <ConnectionProfileEmptyState />
                </section>
              ) : null}
            </div>
          )}
        </div>
    </main>
  );
}
