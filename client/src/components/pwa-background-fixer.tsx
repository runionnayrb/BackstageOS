import { useEffect } from 'react';

export function PWABackgroundFixer() {
  useEffect(() => {
    // Detect PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone ||
                  document.referrer.includes('android-app://');
                  
    if (isPWA) {
      console.log('[PWA Background Fixer] Detected PWA mode - forcing white background');
      
      // Nuclear approach - force white background on everything
      const forceWhiteBackground = () => {
        // Force on document and body
        document.documentElement.style.setProperty('background-color', 'white', 'important');
        document.documentElement.style.setProperty('background', 'white', 'important');
        document.body.style.setProperty('background-color', 'white', 'important');
        document.body.style.setProperty('background', 'white', 'important');
        
        // Find all elements with blue backgrounds and force them white
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el: any) => {
          if (el.style) {
            const computedStyle = window.getComputedStyle(el);
            const bgColor = computedStyle.backgroundColor;
            
            // If element has any blue background, force it to white
            if (bgColor.includes('blue') || bgColor.includes('rgb(37, 99, 235)') || bgColor.includes('#2563eb')) {
              el.style.setProperty('background-color', 'white', 'important');
              el.style.setProperty('background', 'white', 'important');
              console.log('[PWA Background Fixer] Fixed blue background on:', el);
            }
          }
        });
        
        // Add global style override
        let styleEl = document.getElementById('pwa-white-background-fix');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'pwa-white-background-fix';
          document.head.appendChild(styleEl);
        }
        
        styleEl.textContent = `
          /* PWA White Background Fix - v6.0.0 */
          html, body, #root, .App {
            background-color: white !important;
            background: white !important;
          }
          
          /* Force header white background in PWA */
          @media (display-mode: standalone) {
            *, *::before, *::after {
              background-color: white !important;
            }
            
            .bg-blue-600, .bg-blue-500, .bg-primary {
              background-color: white !important;
            }
          }
        `;
      };
      
      // Apply immediately
      forceWhiteBackground();
      
      // Apply again after a short delay in case content loads later
      setTimeout(forceWhiteBackground, 100);
      setTimeout(forceWhiteBackground, 500);
      setTimeout(forceWhiteBackground, 1000);
      
      // Set up observer to fix any new elements that appear
      const observer = new MutationObserver(() => {
        forceWhiteBackground();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      return () => observer.disconnect();
    }
  }, []);
  
  return null;
}