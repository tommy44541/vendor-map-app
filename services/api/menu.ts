import { ApiSuccessResponse, request } from "./util";

// 後端 V3:menu_items.category (text enum) 已 DROP,改成 menu_items.category_id (uuid)
// FK 到 discovery_subcategories.id。前端送 / 收的也是 uuid string。
// 顯示中文 label 在前端 utils/discovery/labels.ts 透過 slug 翻譯。

export interface MenuItem {
  id: string;
  merchant_id: string;
  name: string;
  description?: string | null;
  // 舊資料 row 可能 null(category 欄位 DROP 時資料不會回填)。
  category_id?: string | null;
  price: number;
  currency: string;
  prep_minutes: number;
  is_available: boolean;
  is_popular: boolean;
  display_order: number;
  image_url?: string | null;
  external_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantMenuPagination {
  page: number;
  page_size: number;
  total: number;
}

export interface MerchantMenuListData {
  items: MenuItem[];
  pagination: MerchantMenuPagination;
}

export interface GetMerchantMenuItemsParams {
  category_id?: string;
  is_available?: boolean;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface UpsertMenuItemRequest {
  name: string;
  description?: string | null;
  category_id: string;
  price: number;
  currency: string;
  prep_minutes: number;
  is_available?: boolean;
  is_popular?: boolean;
  image_url?: string | null;
  external_url?: string | null;
}

export interface UpdateMenuItemRequest {
  name: string;
  description?: string | null;
  category_id: string;
  price: number;
  currency: string;
  prep_minutes: number;
  is_available: boolean;
  is_popular: boolean;
  image_url?: string | null;
  external_url?: string | null;
}

export interface ReorderMenuItemsRequest {
  item_ids: string[];
}

export interface ReorderMenuItemsData {
  updated_count: number;
}

export type GetMerchantMenuItemsResponse = ApiSuccessResponse<MerchantMenuListData>;
export type CreateMenuItemResponse = ApiSuccessResponse<MenuItem>;
export type UpdateMenuItemResponse = ApiSuccessResponse<MenuItem>;
export type UpdateMenuItemStatusResponse = ApiSuccessResponse<MenuItem>;
export type DeleteMenuItemResponse = ApiSuccessResponse<{ message: string }>;
export type ReorderMenuItemsResponse = ApiSuccessResponse<ReorderMenuItemsData>;

const buildQueryString = (params?: GetMerchantMenuItemsParams) => {
  if (!params) return "";

  const query = new URLSearchParams();

  if (params.category_id) query.set("category_id", params.category_id);
  if (typeof params.is_available === "boolean") {
    query.set("is_available", String(params.is_available));
  }
  if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.page_size === "number") {
    query.set("page_size", String(params.page_size));
  }

  const str = query.toString();
  return str ? `?${str}` : "";
};

export const menuApi = {
  getMerchantMenuItems: (params?: GetMerchantMenuItemsParams) =>
    request<MerchantMenuListData>(
      `/api/v1/menus/merchant${buildQueryString(params)}`,
      {
        requireAuth: true,
        method: "GET",
      }
    ) as Promise<GetMerchantMenuItemsResponse>,

  getPublicMerchantMenu: (
    merchantId: string,
    params?: Omit<GetMerchantMenuItemsParams, "is_available">
  ) =>
    request<MerchantMenuListData>(
      `/api/v1/merchants/${merchantId}/menu${buildQueryString(params)}`,
      {
        requireAuth: true,
        method: "GET",
      }
    ) as Promise<GetMerchantMenuItemsResponse>,

  createMenuItem: (body: UpsertMenuItemRequest) =>
    request<MenuItem>("/api/v1/menus/merchant", {
      requireAuth: true,
      method: "POST",
      body,
    }) as Promise<CreateMenuItemResponse>,

  updateMenuItem: (itemId: string, body: UpdateMenuItemRequest) =>
    request<MenuItem>(`/api/v1/menus/merchant/${itemId}`, {
      requireAuth: true,
      method: "PUT",
      body,
    }) as Promise<UpdateMenuItemResponse>,

  updateMenuItemStatus: (itemId: string, isAvailable: boolean) =>
    request<MenuItem>(`/api/v1/menus/merchant/${itemId}/status`, {
      requireAuth: true,
      method: "PATCH",
      body: { is_available: isAvailable },
    }) as Promise<UpdateMenuItemStatusResponse>,

  deleteMenuItem: (itemId: string) =>
    request<{ message: string }>(`/api/v1/menus/merchant/${itemId}`, {
      requireAuth: true,
      method: "DELETE",
    }) as Promise<DeleteMenuItemResponse>,

  reorderMenuItems: (body: ReorderMenuItemsRequest) =>
    request<ReorderMenuItemsData>("/api/v1/menus/merchant/reorder", {
      requireAuth: true,
      method: "PATCH",
      body,
    }) as Promise<ReorderMenuItemsResponse>,
};
