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
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private userId?: string;
  private currentPage: string = '';
  private isLoggingEnabled: boolean = true;

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.trackPageChanges();
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
  }

  public enable() {
    this.isLoggingEnabled = true;
  }

  public disable() {
    this.isLoggingEnabled = false;
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
      this.logError({
        errorType: 'javascript_error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        page: this.currentPage,
        stackTrace: event.reason?.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        additionalData: {
          reason: event.reason
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
        
        // Log failed network requests
        if (!response.ok) {
          this.logError({
            errorType: 'network_error',
            message: `Network request failed: ${response.status} ${response.statusText}`,
            page: this.currentPage,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            userId: this.userId,
            additionalData: {
              url: args[0] as string,
              status: response.status,
              statusText: response.statusText
            }
          });
        }
        
        return response;
      } catch (error) {
        this.logError({
          errorType: 'network_error',
          message: `Network request error: ${error}`,
          page: this.currentPage,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: this.userId,
          additionalData: {
            url: args[0] as string,
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

  private async logError(errorData: ErrorLogData) {
    if (!this.isLoggingEnabled) return;

    try {
      // Use stored user ID, don't fetch during error logging to avoid circular issues
      const finalErrorData = {
        ...errorData,
        userId: this.userId || errorData.userId
      };

      // Use a separate API endpoint for error logging to avoid circular errors
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalErrorData),
      });
    } catch (error) {
      // Silently fail - don't create recursive error logging
      console.warn('Failed to log error:', error);
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