"use client";

import { useCallback, useEffect } from "react";

import { NavSidebar, BottomNav, PageHeader } from "@/features/app-shell";
import { useIsMdUp } from "@/lib/hooks/use-media-query";
import { CONNECTIONS } from "@/lib/copy/user-messages";

import { ConnectionProfileEmptyState, ConnectionProfilePanel } from "../components/connection-profile-panel";
import { ConnectionsPageShell } from "../components/connections-page-shell";
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

  const listNode = <ConnectionsList {...listProps} />;

  const detailNode = desktopPanelOpen ? (
    <ConnectionProfilePanel username={selectedUsername} onClose={closeProfile} />
  ) : listLoading ? null : (
    <ConnectionProfileEmptyState />
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <NavSidebar activePath="/connections" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <PageHeader title="Connections" subtitle={CONNECTIONS.pageSubtitle} />

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-6 md:py-5">
          {isDesktop ? (
            <ConnectionsPageShell list={listNode} detail={detailNode} />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">{listNode}</div>
          )}
        </div>
      </main>

      <BottomNav activePath="/connections" />
    </div>
  );
}
