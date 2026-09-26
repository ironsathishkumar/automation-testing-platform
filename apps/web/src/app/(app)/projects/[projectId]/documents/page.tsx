"use client";

import { use } from "react";
import { DocumentsPanel } from "@/features/project-files/DocumentsPanel";

export default function ProjectDocumentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <DocumentsPanel projectId={projectId} />;
}
