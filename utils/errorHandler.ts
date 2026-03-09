import { Alert } from 'react-native';
import { ApiError } from '../services/api/util';

// 錯誤代碼枚舉
export enum ErrorCode {
  // 客戶端錯誤 (4xx)
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  
  // 伺服器錯誤 (5xx)
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// HTTP状态码对应的用户友好消息
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  [ErrorCode.BAD_REQUEST]: '請求格式錯誤，請檢查輸入資料',
  [ErrorCode.UNAUTHORIZED]: '權限錯誤，請重新登入',
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
 * 显示错误提示
 */
export const showErrorAlert = (
  error: any,
  title: string = '錯誤',
  onDismiss?: () => void
) => {
  let message = '錯誤';

  // 直接傳字串：當作訊息顯示
  if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'number') {
    message = HTTP_STATUS_MESSAGES[error] || `錯誤（${error}）`;
  } else if (error instanceof ApiError) {
    message = HTTP_STATUS_MESSAGES[error.status] || error.message || '錯誤';
    if (error.requestId) {
      message = `${message}\n\nrequest_id: ${error.requestId}`;
    }
  } else {
    const status = (error as any)?.status ?? (error as any)?.cause?.status;
    if (typeof status === 'number') {
      message = HTTP_STATUS_MESSAGES[status] || `錯誤（${status}）`;
    } else if ((error as any)?.message) {
      message = String((error as any).message);
    }
  }
  
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
export const isErrorType = (error: any, errorCode: ErrorCode): boolean => {
  return error instanceof ApiError && error.status === errorCode;
};