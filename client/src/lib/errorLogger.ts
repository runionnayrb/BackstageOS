import { apiRequest } from "@/lib/queryClient";

interface ErrorLogData {
  errorType: 'javascript_error' | 'network_error' | 'page_load_failure' | 'click_failure' | 'form_submission_error' | 'navigation_error';
  message: string;
  page: string;
  userAction?: string;
  elementClicked?: string;
  stackTrace?: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  additionalData?: Record<string, any>;
  
  // Enhanced monitoring fields
  browserInfo?: Record<string, any>;
  userJourney?: any[];
  featureContext?: string;
  sessionId?: string;
  errorSignature?: string;
  businessImpact?: string;
}

interface UserAction {
  action: string;
  page: string;
  timestamp: number;
  element?: string;
  data?: Record<string, any>;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private userId?: string;
  private currentPage: string = '';
  private isLoggingEnabled: boolean = true;
  private userJourney: UserAction[] = [];
  private sessionId: string = '';
  private maxJourneyLength: number = 10;

  private constructor() {
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.setupGlobalErrorHandlers();
    this.trackPageChanges();
    this.setupUserTracking();
  }

  private setupUserTracking() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const elementInfo = this.getElementInfo(target);
      this.addToUserJourney('click', this.currentPage, elementInfo);
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const target = event.target as HTMLElement;
      const elementInfo = this.getElementInfo(target);
      this.addToUserJourney('form_submit', this.currentPage, elementInfo);
    });

    // Track key navigation events
    window.addEventListener('popstate', () => {
      this.addToUserJourney('navigation', window.location.pathname);
    });
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  public setUserId(userId: string) {
    this.userId = userId;
  }

  public setCurrentPage(page: string) {
    this.currentPage = page;
    this.addToUserJourney('page_change', page);
  }

  public enable() {
    this.isLoggingEnabled = true;
  }

  public disable() {
    this.isLoggingEnabled = false;
  }

  public isEnabled(): boolean {
    return this.isLoggingEnabled;
  }

  private setupGlobalErrorHandlers() {
    // Catch JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        errorType: 'javascript_error',
        message: event.message,
        page: this.currentPage,
        stackTrace: event.error?.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // Skip logging if the reason is undefined or null (often caused by cancelled requests)
      if (event.reason === undefined || event.reason === null) {
        return;
      }
      
      // Skip cancelled fetch requests (AbortError)
      if (event.reason?.name === 'AbortError') {
        return;
      }
      
      // Skip network-related errors that are already handled
      const reasonString = String(event.reason?.message || event.reason || '');
      if (reasonString.includes('401') || reasonString.includes('403') || reasonString.includes('404')) {
        return;
      }
      
      this.logError({
        errorType: 'javascript_error',
        message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason || 'Unknown error'}`,
        page: this.currentPage,
        stackTrace: event.reason?.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        additionalData: {
          reason: event.reason?.message || String(event.reason)
        }
      });
    });

    // Catch network errors (fetch failures)
    this.interceptFetch();
  }

  private interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Log failed network requests, but skip expected errors
        if (!response.ok) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
          
          // Skip logging expected errors:
          // - 401/403: Authentication/authorization errors (expected when user is logged out)
          // - 404: Resource not found (often expected)
          // - Error logging endpoint to avoid recursive logging
          const skipStatuses = [401, 403, 404];
          const skipEndpoints = ['/api/errors/log', '/api/user/email-provider'];
          
          const shouldSkip = skipStatuses.includes(response.status) || 
            skipEndpoints.some(endpoint => url.includes(endpoint));
          
          if (!shouldSkip) {
            this.logError({
              errorType: 'network_error',
              message: `Network request failed: ${response.status} ${response.statusText}`,
              page: this.currentPage,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              userId: this.userId,
              additionalData: {
                url: url,
                status: response.status,
                statusText: response.statusText
              }
            });
          }
        }
        
        return response;
      } catch (error) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
        
        this.logError({
          errorType: 'network_error',
          message: `Network request error: ${error}`,
          page: this.currentPage,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: this.userId,
          additionalData: {
            url: url,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        throw error;
      }
    };
  }

  private trackPageChanges() {
    // Track page changes for SPAs
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.setCurrentPage(window.location.pathname);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  public logClickFailure(elementInfo: string, expectedAction: string, error?: Error) {
    this.logError({
      errorType: 'click_failure',
      message: `Click failed on ${elementInfo}: ${expectedAction}`,
      page: this.currentPage,
      userAction: 'click',
      elementClicked: elementInfo,
      stackTrace: error?.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      additionalData: {
        expectedAction,
        error: error?.message
      }
    });
  }

  public logFormSubmissionError(formName: string, error: Error) {
    this.logError({
      errorType: 'form_submission_error',
      message: `Form submission failed: ${formName}`,
      page: this.currentPage,
      userAction: 'form_submit',
      elementClicked: formName,
      stackTrace: error.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      additionalData: {
        formName,
        error: error.message
      }
    });
  }

  public logPageLoadFailure(page: string, error?: Error) {
    this.logError({
      errorType: 'page_load_failure',
      message: `Page failed to load: ${page}`,
      page: page,
      userAction: 'navigation',
      stackTrace: error?.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      additionalData: {
        targetPage: page,
        error: error?.message
      }
    });
  }

  public logNavigationError(fromPage: string, toPage: string, error: Error) {
    this.logError({
      errorType: 'navigation_error',
      message: `Navigation failed from ${fromPage} to ${toPage}`,
      page: fromPage,
      userAction: 'navigation',
      stackTrace: error.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      additionalData: {
        fromPage,
        toPage,
        error: error.message
      }
    });
  }

  // Helper methods for enhanced monitoring
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private addToUserJourney(action: string, page: string, element?: string, data?: Record<string, any>) {
    const userAction: UserAction = {
      action,
      page,
      timestamp: Date.now(),
      element,
      data
    };

    this.userJourney.push(userAction);
    
    // Keep only the last N actions
    if (this.userJourney.length > this.maxJourneyLength) {
      this.userJourney.shift();
    }
  }



  private getElementInfo(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    
    // Handle className safely - it might be a string, SVGAnimatedString, or undefined
    let className = '';
    if (element.className) {
      const classNameValue = element.className;
      let classNameStr = '';
      
      if (typeof classNameValue === 'string') {
        classNameStr = classNameValue;
      } else {
        // For SVGAnimatedString or other objects, convert to string safely
        try {
          classNameStr = String(classNameValue);
        } catch (e) {
          classNameStr = '';
        }
      }
      
      className = classNameStr ? `.${classNameStr.split(' ').join('.')}` : '';
    }
    
    const text = element.textContent?.substring(0, 50) || '';
    return `${tagName}${id}${className} "${text}"`.trim();
  }

  private getBrowserInfo(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private getFeatureContext(page: string): string {
    if (page.includes('/calendar')) return 'scheduling';
    if (page.includes('/reports')) return 'reports';
    if (page.includes('/script')) return 'script_editor';
    if (page.includes('/contacts')) return 'contacts';
    if (page.includes('/props') || page.includes('/costumes')) return 'props_costumes';
    if (page.includes('/admin')) return 'admin';
    if (page.includes('/settings')) return 'settings';
    return 'general';
  }

  private generateErrorSignature(errorData: ErrorLogData): string {
    // Create a signature for clustering similar errors
    const messageHash = errorData.message.substring(0, 100);
    const pageContext = this.getFeatureContext(errorData.page);
    return `${errorData.errorType}_${pageContext}_${messageHash}`.replace(/[^a-zA-Z0-9_]/g, '');
  }

  private determineBusinessImpact(errorData: ErrorLogData): string {
    // Determine business impact based on error type and context
    if (errorData.errorType === 'javascript_error' && 
        (errorData.page.includes('/shows') || errorData.page.includes('/reports'))) {
      return 'high'; // Core workflow issues
    }
    if (errorData.errorType === 'network_error' && errorData.message.includes('500')) {
      return 'critical'; // Server errors
    }
    if (errorData.errorType === 'form_submission_error') {
      return 'high'; // Data input issues
    }
    if (errorData.errorType === 'navigation_error') {
      return 'medium'; // Navigation issues
    }
    return 'low'; // Default impact
  }

  private async logError(errorData: ErrorLogData) {
    if (!this.isLoggingEnabled) return;

    // Only log errors from registered users
    if (!this.userId && !errorData.userId) {
      return;
    }

    // Don't log errors in development environment
    if (import.meta.env.DEV || window.location.hostname.includes('replit.dev')) {
      return;
    }

    try {
      // Use stored user ID, don't fetch during error logging to avoid circular issues
      const finalErrorData = {
        ...errorData,
        browserInfo: this.getBrowserInfo(),
        userJourney: [...this.userJourney],
        featureContext: this.getFeatureContext(errorData.page),
        sessionId: this.sessionId,
        errorSignature: this.generateErrorSignature(errorData),
        businessImpact: this.determineBusinessImpact(errorData),
        userId: this.userId || errorData.userId
      };

      // Use a separate API endpoint for error logging to avoid circular errors
      const response = await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalErrorData),
      });
      
      if (!response.ok) {
        console.debug('Error logging response:', response.status);
      }
    } catch (error) {
      // Silently fail - don't create recursive error logging
      console.debug('Failed to log error:', error);
    }
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Export helper functions for easy use in components
export const logClickFailure = (elementInfo: string, expectedAction: string, error?: Error) => {
  errorLogger.logClickFailure(elementInfo, expectedAction, error);
};

export const logFormSubmissionError = (formName: string, error: Error) => {
  errorLogger.logFormSubmissionError(formName, error);
};

export const logPageLoadFailure = (page: string, error?: Error) => {
  errorLogger.logPageLoadFailure(page, error);
};

export const logNavigationError = (fromPage: string, toPage: string, error: Error) => {
  errorLogger.logNavigationError(fromPage, toPage, error);
};