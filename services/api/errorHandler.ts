import { Alert } from 'react-native';
import { ERROR_CODES, ErrorCode, ServerErrorResponse } from './types';

// 错误信息映射 - 中文用户友好的错误提示
const ERROR_MESSAGES: Record<string, string> = {
  // 用户相关错误
  [ERROR_CODES.USER_ALREADY_EXISTS]: '此電子郵件已被註冊，請使用其他電子郵件或直接登入',
  [ERROR_CODES.USER_NOT_FOUND]: '找不到此用戶，請檢查電子郵件地址是否正確',
  [ERROR_CODES.INVALID_CREDENTIALS]: '電子郵件或密碼錯誤，請重新輸入',
  [ERROR_CODES.EMAIL_ALREADY_REGISTERED]: '此電子郵件已被註冊，請使用其他電子郵件',
  
  // 认证相关错误
  [ERROR_CODES.TOKEN_EXPIRED]: '登入已過期，請重新登入',
  [ERROR_CODES.TOKEN_INVALID]: '登入憑證無效，請重新登入',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: '權限不足，無法執行此操作',
  
  // 业务逻辑错误
  [ERROR_CODES.STORE_ALREADY_EXISTS]: '此店名已被使用，請選擇其他店名',
  [ERROR_CODES.INVALID_BUSINESS_LICENSE]: '營業執照號碼無效，請檢查後重新輸入',
  [ERROR_CODES.ORDER_NOT_FOUND]: '找不到此訂單',
  [ERROR_CODES.INSUFFICIENT_STOCK]: '商品庫存不足',
  
  // 通用错误
  'NETWORK_ERROR': '網路連線失敗，請檢查網路設定',
  'TIMEOUT_ERROR': '請求超時，請稍後重試',
  'UNKNOWN_ERROR': '發生未知錯誤，請稍後重試',
};

// HTTP状态码对应的用户友好消息
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  [ErrorCode.BAD_REQUEST]: '請求格式錯誤，請檢查輸入資料',
  [ErrorCode.UNAUTHORIZED]: '請先登入後再執行此操作',
  [ErrorCode.FORBIDDEN]: '權限不足，無法執行此操作',
  [ErrorCode.NOT_FOUND]: '找不到請求的資源',
  [ErrorCode.CONFLICT]: '信箱已被註冊，請使用其他信箱',
  [ErrorCode.UNPROCESSABLE_ENTITY]: '輸入資料無法處理，請檢查後重新輸入',
  [ErrorCode.TOO_MANY_REQUESTS]: '請求過於頻繁，請稍後再試',
  [ErrorCode.INTERNAL_SERVER_ERROR]: '伺服器內部錯誤，請稍後重試',
  [ErrorCode.BAD_GATEWAY]: '伺服器暫時無法連線，請稍後重試',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服務暫時無法使用，請稍後重試',
  [ErrorCode.GATEWAY_TIMEOUT]: '伺服器回應超時，請稍後重試',
};

/**
 * 解析服务器错误响应
 */
export const parseServerError = (error: any): ServerErrorResponse | null => {
  try {
    // 如果是字符串，尝试解析为JSON
    if (typeof error === 'string') {
      const parsed = JSON.parse(error);
      if (parsed.success === false && parsed.code && parsed.message) {
        return parsed;
      }
    }
    
    // 如果已经是对象
    if (typeof error === 'object' && error !== null) {
      if (error.success === false && error.code && error.message) {
        return error;
      }
      
      // 处理fetch API的错误
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          code: 0,
          message: '網路連線失敗',
          error: {
            code: 'NETWORK_ERROR',
            details: error.message
          }
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * 获取用户友好的错误消息
 */
export const getUserFriendlyMessage = (error: any): string => {
  const serverError = parseServerError(error);
  
  if (serverError) {
    // 优先使用错误代码对应的消息
    if (serverError.error?.code && ERROR_MESSAGES[serverError.error.code]) {
      return ERROR_MESSAGES[serverError.error.code];
    }
    
    // 使用HTTP状态码对应的消息
    if (HTTP_STATUS_MESSAGES[serverError.code]) {
      return HTTP_STATUS_MESSAGES[serverError.code];
    }
    
    // 使用服务器返回的消息
    if (serverError.message) {
      return serverError.message;
    }
  }
  
  // 处理其他类型的错误
  if (error instanceof Error) {
    if (error.message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    return error.message;
  }
  
  // 默认错误消息
  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

/**
 * 显示错误提示
 */
export const showErrorAlert = (
  error: any, 
  title: string = '錯誤',
  onDismiss?: () => void
) => {
  const message = getUserFriendlyMessage(error);
  
  Alert.alert(
    title,
    message,
    [
      {
        text: '確定',
        onPress: onDismiss
      }
    ]
  );
};

/**
 * 显示成功提示
 */
export const showSuccessAlert = (
  message: string,
  title: string = '成功',
  onDismiss?: () => void
) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: '確定',
        onPress: onDismiss
      }
    ]
  );
};

/**
 * 检查是否为特定类型的错误
 */
export const isErrorType = (error: any, errorCode: string): boolean => {
  const serverError = parseServerError(error);
  return serverError?.error?.code === errorCode;
};

/**
 * 检查是否为网络错误
 */
export const isNetworkError = (error: any): boolean => {
  return isErrorType(error, 'NETWORK_ERROR') || 
         (error instanceof Error && error.message.includes('fetch'));
};

/**
 * 检查是否为认证错误
 */
export const isAuthError = (error: any): boolean => {
  const serverError = parseServerError(error);
  if (serverError) {
    return serverError.code === ErrorCode.UNAUTHORIZED || 
           serverError.code === ErrorCode.FORBIDDEN ||
           isErrorType(error, ERROR_CODES.TOKEN_EXPIRED) ||
           isErrorType(error, ERROR_CODES.TOKEN_INVALID);
  }
  return false;
};

/**
 * 检查是否为冲突错误（如用户已存在）
 */
export const isConflictError = (error: any): boolean => {
  const serverError = parseServerError(error);
  return serverError?.code === ErrorCode.CONFLICT;
};

// 重新导出ERROR_CODES供其他模块使用
export { ERROR_CODES } from './types';
