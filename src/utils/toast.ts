// Web-compatible toast utility to replace @raycast/api toast functionality

export enum ToastStyle {
  Success = "success",
  Failure = "failure",
  Warning = "warning",
}

export interface ToastOptions {
  style?: ToastStyle;
  title: string;
  message?: string;
}

// Simple toast implementation for web
export async function showToast(options: ToastOptions): Promise<void> {
  // For now, use console logging and browser notifications
  const { style = ToastStyle.Success, title, message } = options;
  
  const fullMessage = message ? `${title}: ${message}` : title;
  
  // Console logging for development
  switch (style) {
    case ToastStyle.Success:
      console.log(`✅ ${fullMessage}`);
      break;
    case ToastStyle.Failure:
      console.error(`❌ ${fullMessage}`);
      break;
    case ToastStyle.Warning:
      console.warn(`⚠️ ${fullMessage}`);
      break;
    default:
      console.log(fullMessage);
  }
  
  // Try to show browser notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: style === ToastStyle.Success ? '✅' : style === ToastStyle.Failure ? '❌' : '⚠️'
    });
  }
}

// Legacy Toast object for compatibility
export const Toast = {
  Style: {
    Success: ToastStyle.Success,
    Failure: ToastStyle.Failure,
    Warning: ToastStyle.Warning,
  },
};

// Request notification permission on first use
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}