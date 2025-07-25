// Label/Input Debugging Utility
// This script finds all mismatched htmlFor attributes in the codebase

export function debugLabelMatching() {
  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debugLabelMatching);
    return [];
  }
  
  console.log('🔍 Starting Label/Input matching debug...');
  
  // Get all labels with for attributes (both htmlFor and for attributes)
  const labels = document.querySelectorAll('label[for]');
  const mismatches: Array<{
    labelElement: HTMLLabelElement;
    forAttribute: string;
    matchingElement: Element | null;
    error: string;
    componentInfo?: string;
  }> = [];

  labels.forEach((label) => {
    const htmlLabel = label as HTMLLabelElement;
    const forAttribute = htmlLabel.getAttribute('for') || htmlLabel.htmlFor;
    
    if (!forAttribute) return;

    const matchingElement = document.getElementById(forAttribute);
    
    // Get component context for better debugging
    const getComponentContext = (element: Element): string => {
      let current = element.parentElement;
      let depth = 0;
      while (current && depth < 5) {
        if (current.getAttribute('data-component') || current.className.includes('component')) {
          return current.tagName + (current.className ? '.' + current.className.split(' ')[0] : '');
        }
        current = current.parentElement;
        depth++;
      }
      return 'Unknown component';
    };
    
    if (!matchingElement) {
      mismatches.push({
        labelElement: htmlLabel,
        forAttribute,
        matchingElement: null,
        error: `No element found with id="${forAttribute}"`,
        componentInfo: getComponentContext(htmlLabel)
      });
    } else {
      // Check if it's a valid form element or shadcn Select trigger
      const isValidTarget = 
        ['input', 'textarea', 'select', 'button'].includes(matchingElement.tagName.toLowerCase()) ||
        matchingElement.hasAttribute('role') ||
        matchingElement.getAttribute('aria-haspopup') === 'listbox' ||
        matchingElement.classList.contains('select-trigger');
        
      if (!isValidTarget) {
        mismatches.push({
          labelElement: htmlLabel,
          forAttribute,
          matchingElement,
          error: `Element with id="${forAttribute}" is not a form element (${matchingElement.tagName})`,
          componentInfo: getComponentContext(htmlLabel)
        });
      }
    }
  });

  console.log(`Found ${labels.length} labels with 'for' attributes`);
  console.log(`Found ${mismatches.length} mismatches`);
  
  if (mismatches.length > 0) {
    console.error('🚨 Label/Input Mismatches Found:');
    mismatches.forEach((mismatch, index) => {
      console.error(`${index + 1}. ${mismatch.error}`);
      console.error('   Label text:', mismatch.labelElement.textContent?.trim());
      console.error('   Component:', mismatch.componentInfo);
      console.error('   Label element:', mismatch.labelElement);
      if (mismatch.matchingElement) {
        console.error('   Target element:', mismatch.matchingElement);
      }
      console.error('---');
    });
    
    // Also log a summary for easy fixing
    console.error('🔧 Quick Fix Summary:');
    mismatches.forEach((mismatch) => {
      console.error(`Label "${mismatch.labelElement.textContent?.trim()}" -> Missing id="${mismatch.forAttribute}" in ${mismatch.componentInfo}`);
    });
    
    // Show browser console error format
    console.error('\n📋 Browser Console Error Format:');
    console.error('Incorrect use of <label for=FORM_ELEMENT>');
    console.error(`The label's for attribute doesn't match any element id. Found ${mismatches.length} mismatches.`);
    
  } else {
    console.log('✅ All labels have matching form elements!');
    console.log('🎉 Browser console "Incorrect use of <label for=FORM_ELEMENT>" errors should be resolved!');
  }

  return mismatches;
}

// Enhanced debugging with React component detection
export function debugReactLabels() {
  // Look for React-specific patterns
  const reactLabels = document.querySelectorAll('label[data-radix-label], label[class*="label"]');
  console.log(`Found ${reactLabels.length} React/Radix labels`);
  
  reactLabels.forEach((label, index) => {
    const htmlLabel = label as HTMLLabelElement;
    const forAttr = htmlLabel.htmlFor || htmlLabel.getAttribute('for');
    console.log(`${index + 1}. React Label:`, {
      text: htmlLabel.textContent?.trim(),
      htmlFor: forAttr,
      hasMatchingElement: forAttr ? !!document.getElementById(forAttr) : false,
      element: htmlLabel
    });
  });
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