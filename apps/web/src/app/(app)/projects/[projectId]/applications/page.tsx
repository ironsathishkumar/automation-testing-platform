"use client";

import { use } from "react";
import { ApplicationsPanel } from "@/features/applications/ApplicationsPanel";

export default function ApplicationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <ApplicationsPanel projectId={projectId} />;
}
