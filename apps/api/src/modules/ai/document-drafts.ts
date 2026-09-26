import { DocumentSection } from "@atp/shared-types";
import { CreateTestCaseInput } from "@atp/validation";

export const DOCUMENT_TAG = "from-doc";

type Draft = Omit<CreateTestCaseInput, "applicationId">;

export function engineForApplication(applicationType: string): "web" | "api" {
  return applicationType === "api" || applicationType === "service" ? "api" : "web";
}

export function starterSteps(engineType: "web" | "api"): Draft["steps"] {
  if (engineType === "api") {
    return [{ id: "doc-1", order: 0, action: "httpRequest", target: "/", assertion: { status: 200 } }];
  }
  return [
    { id: "doc-1", order: 0, action: "navigate", value: "/" },
    { id: "doc-2", order: 1, action: "assertVisible", target: "body" },
  ];
}

export function sectionDrafts(fileName: string, sections: DocumentSection[], engineType: "web" | "api"): Draft[] {
  const seen = new Map<string, number>();
  return sections
    .filter((section) => section.body.trim().length > 0)
    .map((section) => {
      const base = (section.title.trim().length >= 2 ? section.title.trim() : `${section.title.trim()} requirement`).slice(0, 190);
      const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
      seen.set(base.toLowerCase(), count);
      return {
        title: count > 1 ? `${base} (${count})` : base,
        objective: `Check the "${section.title.trim()}" requirement from ${fileName}.`.slice(0, 2000),
        description: section.body.trim().slice(0, 4000),
        type: engineType === "api" ? "api" : "functional",
        engineType,
        priority: "medium",
        status: "draft",
        tags: [DOCUMENT_TAG],
        preconditions: [],
        steps: starterSteps(engineType),
      };
    });
}
