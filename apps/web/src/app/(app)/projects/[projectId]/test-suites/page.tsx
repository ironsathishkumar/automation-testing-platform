"use client";

import { use } from "react";
import { SuitesPanel } from "@/features/test-suites/SuitesPanel";

export default function SuitesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <SuitesPanel projectId={projectId} />;
}
