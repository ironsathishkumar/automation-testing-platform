import { SECRET_MASK } from "@atp/shared-types";

export { SECRET_MASK };

export interface StoredVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

export function presentVariables(variables: StoredVariable[]): StoredVariable[] {
  return variables.map((variable) => ({
    key: variable.key,
    isSecret: variable.isSecret,
    value: variable.isSecret ? SECRET_MASK : variable.value,
  }));
}

export function mergeVariables(existing: StoredVariable[], incoming: StoredVariable[]): StoredVariable[] {
  const previous = new Map(existing.map((variable) => [variable.key, variable]));
  return incoming.map((variable) => {
    const prior = previous.get(variable.key);
    const keepsStoredSecret =
      variable.isSecret && prior?.isSecret && (variable.value === SECRET_MASK || variable.value === "");
    if (keepsStoredSecret && prior) {
      return { key: variable.key, isSecret: true, value: prior.value };
    }
    return variable;
  });
}
