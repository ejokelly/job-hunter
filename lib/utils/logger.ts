export class Logger {
  static step(stepNumber: number, message: string): void {
    console.log(`🔄 STEP ${stepNumber}: ${message}`);
  }

  static stepComplete(stepNumber: number, message: string, details?: any): void {
    console.log(`✅ STEP ${stepNumber} COMPLETE - ${message}`);
    if (details) {
      console.log(details);
    }
  }

  static stepError(stepNumber: number, message: string, error: any): void {
    console.log(`❌ STEP ${stepNumber} ERROR - ${message}:`, error);
  }

  static info(message: string, data?: any): void {
    console.log(`🔄 ${message}`);
    if (data) {
      console.log(data);
    }
  }

  static success(message: string, data?: any): void {
    console.log(`✅ ${message}`);
    if (data) {
      console.log(data);
    }
  }

  static error(message: string, error: any): void {
    console.log(`❌ ${message}:`, error);
  }

  static debug(label: string, data: any): void {
    console.log(`🔍 ${label}:`, data);
  }
}