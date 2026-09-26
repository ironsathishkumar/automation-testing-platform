"use client";

import { use } from "react";
import { EnvironmentsPanel } from "@/features/environments/EnvironmentsPanel";

export default function EnvironmentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <EnvironmentsPanel projectId={projectId} />;
}
