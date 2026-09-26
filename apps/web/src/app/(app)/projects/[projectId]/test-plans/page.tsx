"use client";

import { use } from "react";
import { PlansPanel } from "@/features/test-plans/PlansPanel";

export default function PlansPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <PlansPanel projectId={projectId} />;
}
