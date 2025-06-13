import { ERROR_MESSAGES } from '../constants/app-constants';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: Error;
}

export class AppErrorHandler {
  static handleError(error: any): AppError {
    console.error('Error occurred:', error);

    // Handle Supabase errors
    if (error?.message) {
      return {
        message: error.message,
        code: error.code,
        statusCode: error.status,
        originalError: error,
      };
    }

    // Handle network errors
    if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
      return {
        message: ERROR_MESSAGES.network,
        code: 'NETWORK_ERROR',
        originalError: error,
      };
    }

    // Handle HTTP status codes
    if (error?.status || error?.statusCode) {
      const statusCode = error.status || error.statusCode;
      
      switch (statusCode) {
        case 401:
          return {
            message: ERROR_MESSAGES.unauthorized,
            code: 'UNAUTHORIZED',
            statusCode,
            originalError: error,
          };
        case 404:
          return {
            message: ERROR_MESSAGES.notFound,
            code: 'NOT_FOUND',
            statusCode,
            originalError: error,
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            message: ERROR_MESSAGES.serverError,
            code: 'SERVER_ERROR',
            statusCode,
            originalError: error,
          };
        default:
          return {
            message: error.message || ERROR_MESSAGES.unknown,
            code: 'HTTP_ERROR',
            statusCode,
            originalError: error,
          };
      }
    }

    // Handle validation errors
    if (error?.name === 'ValidationError') {
      return {
        message: ERROR_MESSAGES.validation,
        code: 'VALIDATION_ERROR',
        originalError: error,
      };
    }

    // Default error handling
    return {
      message: error?.message || ERROR_MESSAGES.unknown,
      code: 'UNKNOWN_ERROR',
      originalError: error,
    };
  }

  static getErrorMessage(error: any): string {
    const appError = this.handleError(error);
    return appError.message;
  }

  static isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' || !navigator.onLine;
  }

  static isAuthError(error: any): boolean {
    return error?.statusCode === 401 || error?.code === 'UNAUTHORIZED';
  }

  static shouldRetry(error: any): boolean {
    const appError = this.handleError(error);
    
    // Don't retry client errors (4xx) except for specific cases
    if (appError.statusCode && appError.statusCode >= 400 && appError.statusCode < 500) {
      // Retry on 408 (timeout) and 429 (rate limit)
      return appError.statusCode === 408 || appError.statusCode === 429;
    }

    // Retry on network errors and server errors (5xx)
    return this.isNetworkError(error) || (appError.statusCode && appError.statusCode >= 500);
  }
}
