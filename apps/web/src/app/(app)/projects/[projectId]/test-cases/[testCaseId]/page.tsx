"use client";

import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TestCaseForm } from "@/features/test-cases/TestCaseForm";

export default function EditTestCasePage({ params }: { params: Promise<{ projectId: string; testCaseId: string }> }) {
  const { projectId, testCaseId } = use(params);
  return (
    <>
      <PageHeader title="Edit test case" subtitle="Update steps, then validate before marking the case ready." />
      <TestCaseForm projectId={projectId} testCaseId={testCaseId} />
    </>
  );
}
