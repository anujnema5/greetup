"use client";

import { memo } from "react";

import { PageHeader } from "@/features/app-shell";

import { useDashboardGreeting } from "../hooks/use-dashboard-greeting";

function DashboardHeaderInner() {
  const { title, subtitle } = useDashboardGreeting();
  return <PageHeader title={title} subtitle={subtitle} />;
}

export const DashboardHeader = memo(DashboardHeaderInner);
