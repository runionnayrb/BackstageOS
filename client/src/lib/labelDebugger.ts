// Label/Input Debugging Utility - DISABLED
// This utility was used to fix HTML label accessibility errors and is now disabled

export function debugLabelMatching() {
  // Debugging utility disabled - label errors have been resolved
  return [];
}

// Auto-run when DOM is ready
if (typeof window !== 'undefined') {
  const runDebugger = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', debugLabelMatching);
    } else {
      debugLabelMatching();
    }
  };

  // Run immediately and also on route changes (for SPA)
  runDebugger();
  
  // Make it available globally
  (window as any).debugLabelMatching = debugLabelMatching;
  console.log('🔧 Label debugger available globally as window.debugLabelMatching()');
}