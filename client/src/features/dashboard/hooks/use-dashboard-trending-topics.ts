"use client";

import { useMemo } from "react";

import { useGetMyProfileQuery } from "@/features/profile-setup/components/profile-setup-api";

const TRENDING_TOPICS_LIMIT = 6;

export function useDashboardTrendingTopics(limit = TRENDING_TOPICS_LIMIT) {
  const query = useGetMyProfileQuery(undefined, { refetchOnMountOrArgChange: true });

  const topics = useMemo(() => {
    const interests = query.data?.data?.interests ?? [];
    return interests.slice(0, limit).map((interest) => interest.displayName);
  }, [limit, query.data?.data?.interests]);

  return {
    topics,
    isLoading: query.isLoading,
  };
}
