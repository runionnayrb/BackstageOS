// React useState Debug Utilities
// This file contains comprehensive debugging tools to detect useState violations

interface HookCallInfo {
  componentName: string;
  hookName: string;
  callOrder: number;
  timestamp: number;
  stackTrace: string;
}

class ReactHookDebugger {
  private static instance: ReactHookDebugger;
  private hookCalls: Map<string, HookCallInfo[]> = new Map();
  private componentRenderCounts: Map<string, number> = new Map();
  private isDebuggingEnabled = true;

  static getInstance(): ReactHookDebugger {
    if (!ReactHookDebugger.instance) {
      ReactHookDebugger.instance = new ReactHookDebugger();
    }
    return ReactHookDebugger.instance;
  }

  logHookCall(componentName: string, hookName: string) {
    if (!this.isDebuggingEnabled) return;

    const renderCount = this.componentRenderCounts.get(componentName) || 0;
    this.componentRenderCounts.set(componentName, renderCount + 1);

    const callInfo: HookCallInfo = {
      componentName,
      hookName,
      callOrder: this.getCallOrder(componentName),
      timestamp: Date.now(),
      stackTrace: new Error().stack || ''
    };

    if (!this.hookCalls.has(componentName)) {
      this.hookCalls.set(componentName, []);
    }
    this.hookCalls.get(componentName)!.push(callInfo);

    // Check for Hook Rule violations
    this.checkHookRuleViolations(callInfo);
  }

  private getCallOrder(componentName: string): number {
    const calls = this.hookCalls.get(componentName) || [];
    return calls.length + 1;
  }

  private checkHookRuleViolations(callInfo: HookCallInfo) {
    const { componentName, hookName, stackTrace } = callInfo;

    // Check if hook is called inside loop, condition, or nested function
    if (this.isHookInInvalidLocation(stackTrace)) {
      console.error(`🚨 HOOK RULE VIOLATION: ${hookName} called inside loop/condition/nested function in ${componentName}`);
      console.error('Stack trace:', stackTrace);
    }

    // Check if hook is called after early return
    if (this.isHookAfterEarlyReturn(stackTrace)) {
      console.error(`🚨 HOOK RULE VIOLATION: ${hookName} called after early return in ${componentName}`);
      console.error('Stack trace:', stackTrace);
    }

    // Check for inconsistent hook call order
    this.checkHookOrderConsistency(componentName);
  }

  private isHookInInvalidLocation(stackTrace: string): boolean {
    // Check for patterns that indicate hooks called in invalid locations
    const invalidPatterns = [
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /\.map\(/,
      /\.forEach\(/,
      /\.filter\(/,
      /useCallback\(/,
      /useMemo\(/
    ];

    return invalidPatterns.some(pattern => pattern.test(stackTrace));
  }

  private isHookAfterEarlyReturn(stackTrace: string): boolean {
    // This is harder to detect statically, but we can check for certain patterns
    return stackTrace.includes('return') && stackTrace.includes('useState');
  }

  private checkHookOrderConsistency(componentName: string) {
    const calls = this.hookCalls.get(componentName) || [];
    const renderCount = this.componentRenderCounts.get(componentName) || 0;

    if (renderCount > 1) {
      // Check if hook order is consistent across renders
      const currentRenderHooks = calls.filter(call => 
        call.timestamp > (Date.now() - 1000) // Last second
      );

      if (currentRenderHooks.length !== calls.length / renderCount) {
        console.warn(`⚠️ POTENTIAL HOOK ORDER ISSUE: Inconsistent hook count in ${componentName}`);
      }
    }
  }

  // Method to check useState usage patterns
  checkUseStatePatterns(componentName: string, stateName: string, initialValue: any) {
    console.log(`🔍 useState Debug - ${componentName}.${stateName}:`, {
      initialValue,
      type: typeof initialValue,
      isUndefined: initialValue === undefined,
      isNull: initialValue === null,
      timestamp: new Date().toISOString()
    });

    // Check for common useState mistakes
    if (initialValue === undefined && stateName !== 'undefined') {
      console.warn(`⚠️ useState Warning: ${stateName} initialized with undefined in ${componentName}`);
    }

    if (Array.isArray(initialValue) && initialValue.length === 0) {
      console.log(`📝 useState Info: ${stateName} initialized with empty array in ${componentName}`);
    }

    if (typeof initialValue === 'object' && initialValue !== null && Object.keys(initialValue).length === 0) {
      console.log(`📝 useState Info: ${stateName} initialized with empty object in ${componentName}`);
    }
  }

  // Method to check for direct state mutations
  checkStateMutation(componentName: string, stateName: string, oldValue: any, newValue: any) {
    if (typeof oldValue === 'object' && oldValue !== null && oldValue === newValue) {
      console.error(`🚨 STATE MUTATION ERROR: Direct mutation detected in ${componentName}.${stateName}`);
      console.error('Old value:', oldValue);
      console.error('New value:', newValue);
    }
  }

  // Enable/disable debugging
  setDebugging(enabled: boolean) {
    this.isDebuggingEnabled = enabled;
    console.log(`React Hook Debugging ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Get debug report
  getDebugReport(): string {
    let report = '\n=== REACT HOOK DEBUG REPORT ===\n';
    
    this.hookCalls.forEach((calls, componentName) => {
      const renderCount = this.componentRenderCounts.get(componentName) || 0;
      report += `\nComponent: ${componentName} (${renderCount} renders)\n`;
      report += `Total Hook Calls: ${calls.length}\n`;
      
      const hookTypes = [...new Set(calls.map(call => call.hookName))];
      report += `Hook Types Used: ${hookTypes.join(', ')}\n`;
    });

    return report;
  }

  // Clear debug data
  clearDebugData() {
    this.hookCalls.clear();
    this.componentRenderCounts.clear();
    console.log('🗑️ React Hook debug data cleared');
  }
}

// Enhanced useState wrapper with debugging
export function debugUseState<T>(
  initialValue: T | (() => T),
  componentName: string,
  stateName: string
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const debugger = ReactHookDebugger.getInstance();
  
  // Log the hook call
  debugger.logHookCall(componentName, 'useState');
  
  // Get initial value for logging
  const resolvedInitialValue = typeof initialValue === 'function' 
    ? (initialValue as () => T)() 
    : initialValue;
  
  // Check useState patterns
  debugger.checkUseStatePatterns(componentName, stateName, resolvedInitialValue);
  
  // Import useState dynamically to avoid circular dependency
  const { useState } = require('react');
  const [state, setState] = useState(initialValue);
  
  // Wrap setState to detect mutations
  const debugSetState: React.Dispatch<React.SetStateAction<T>> = (value) => {
    const oldValue = state;
    debugger.checkStateMutation(componentName, stateName, oldValue, value);
    setState(value);
  };
  
  return [state, debugSetState];
}

// Global debugging controls
export const hookDebugger = ReactHookDebugger.getInstance();

// Console commands for debugging
if (typeof window !== 'undefined') {
  (window as any).hookDebugger = hookDebugger;
  console.log('🔧 Hook debugger available globally as window.hookDebugger');
  console.log('Commands: hookDebugger.getDebugReport(), hookDebugger.setDebugging(false), hookDebugger.clearDebugData()');
}

// Export debugging utilities
export const enableHookDebugging = () => hookDebugger.setDebugging(true);
export const disableHookDebugging = () => hookDebugger.setDebugging(false);
export const getHookDebugReport = () => hookDebugger.getDebugReport();
export const clearHookDebugData = () => hookDebugger.clearDebugData();