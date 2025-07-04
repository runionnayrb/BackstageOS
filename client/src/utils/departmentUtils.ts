// Default department names for tech reports
export const DEFAULT_DEPARTMENT_NAMES = {
  scenic: 'Scenic',
  lighting: 'Lighting',
  audio: 'Audio',
  video: 'Video',
  props: 'Props'
} as const;

export type DepartmentKey = keyof typeof DEFAULT_DEPARTMENT_NAMES;

export function getDepartmentDisplayName(
  department: DepartmentKey,
  customNames?: Record<string, string>
): string {
  return customNames?.[department] || DEFAULT_DEPARTMENT_NAMES[department];
}

export function getAllDepartmentNames(
  customNames?: Record<string, string>,
  departmentOrder?: string[]
): Array<{
  key: DepartmentKey;
  displayName: string;
}> {
  const defaultOrder = Object.keys(DEFAULT_DEPARTMENT_NAMES) as DepartmentKey[];
  const orderedKeys = departmentOrder && departmentOrder.length > 0 
    ? departmentOrder.filter(key => key in DEFAULT_DEPARTMENT_NAMES) as DepartmentKey[]
    : defaultOrder;
  
  return orderedKeys.map(key => ({
    key,
    displayName: getDepartmentDisplayName(key, customNames)
  }));
}