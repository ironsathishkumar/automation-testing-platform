"use client";

import { use } from "react";
import { DocumentWorkspace } from "@/features/project-files/DocumentWorkspace";

export default function DocumentPage({ params }: { params: Promise<{ projectId: string; fileId: string }> }) {
  const { projectId, fileId } = use(params);
  return <DocumentWorkspace projectId={projectId} fileId={fileId} />;
}
