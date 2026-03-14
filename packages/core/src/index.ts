export interface ToolModule {
  key: string
  label: string
  description: string
}

export function createToolModule(input: ToolModule): ToolModule {
  return {
    key: input.key.trim().toLowerCase(),
    label: input.label.trim(),
    description: input.description.trim(),
  }
}

export function listModuleKeys(modules: ToolModule[]): string[] {
  return modules.map((module) => module.key)
}
