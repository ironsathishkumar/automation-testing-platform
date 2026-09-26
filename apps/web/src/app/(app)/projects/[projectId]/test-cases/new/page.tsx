"use client";

import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TestCaseForm } from "@/features/test-cases/TestCaseForm";

export default function NewTestCasePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return (
    <>
      <PageHeader title="New test case" subtitle="Choose an application and describe the steps." />
      <TestCaseForm projectId={projectId} />
    </>
  );
}
