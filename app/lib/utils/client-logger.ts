'use client'

interface LogMetadata {
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  error?: Error | string
  data?: any
  [key: string]: any
}

class ClientLogger {
  private sessionId: string
  private userId?: string
  private isEnabled: boolean

  constructor() {
    this.sessionId = this.generateSessionId()
    this.isEnabled = typeof window !== 'undefined' && process.env.NODE_ENV !== 'production'
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  private async sendLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, metadata: LogMetadata = {}) {
    if (!this.isEnabled) return

    try {
      const logData = {
        level,
        message,
        metadata: {
          ...metadata,
          userId: this.userId || metadata.userId,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      }

      // Also log to browser console for immediate visibility
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : 
                           level === 'info' ? console.info : console.log
      
      consoleMethod(`[${level.toUpperCase()}] ${message}`, metadata)

      // Send to server (fire and forget)
      fetch('/api/debug/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      }).catch(err => {
        console.warn('Failed to send log to server:', err)
      })
    } catch (error) {
      console.warn('Logger error:', error)
    }
  }

  // Simple logging methods
  debug(message: string, metadata?: LogMetadata) {
    this.sendLog('debug', message, metadata)
  }

  info(message: string, metadata?: LogMetadata) {
    this.sendLog('info', message, metadata)
  }

  warn(message: string, metadata?: LogMetadata) {
    this.sendLog('warn', message, metadata)
  }

  error(message: string, metadata?: LogMetadata) {
    this.sendLog('error', message, metadata)
  }

  // Convenience methods for common scenarios
  userAction(action: string, component?: string, data?: any) {
    this.info(`User action: ${action}`, { 
      component, 
      action, 
      data 
    })
  }

  apiCall(endpoint: string, method: string, status?: number, error?: any) {
    const message = `API ${method} ${endpoint} - ${status || 'pending'}`
    if (error || (status && status >= 400)) {
      this.error(message, { endpoint, method, status, error })
    } else {
      this.debug(message, { endpoint, method, status })
    }
  }

  componentError(component: string, error: Error | string, props?: any) {
    this.error(`Component error in ${component}`, {
      component,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      props
    })
  }

  pageView(page: string, metadata?: LogMetadata) {
    this.info(`Page view: ${page}`, { 
      page, 
      ...metadata 
    })
  }

  performance(metric: string, value: number, unit: string = 'ms') {
    this.debug(`Performance: ${metric} = ${value}${unit}`, {
      metric,
      value,
      unit,
      timestamp: globalThis.performance.now()
    })
  }
}

// Create singleton instance
const logger = new ClientLogger()

export default logger

// Also export individual methods for convenience
export const { debug, info, warn, error, userAction, apiCall, componentError, pageView, performance } = logger
export { logger }