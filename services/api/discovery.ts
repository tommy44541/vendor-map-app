import { ApiSuccessResponse, request } from "./util";

export type DiscoveryStatus = "active" | "inactive";
export type HubType = "market" | "event" | "tourism_area" | "transit_area" | "other";

export interface DiscoveryCategory {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  status?: DiscoveryStatus;
  created_at?: string;
  updated_at?: string;
  subcategories?: DiscoverySubcategory[];
}

export interface DiscoverySubcategory {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  display_order: number;
  status?: DiscoveryStatus;
  created_at?: string;
  updated_at?: string;
}

export interface DiscoveryHub {
  id: string;
  slug: string;
  name: string;
  type: HubType;
  city: string;
  area_name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: DiscoveryStatus;
  created_at?: string;
  updated_at?: string;
}

export interface MerchantDiscoveryProfile {
  discovery_category_id?: string | null;
  discovery_subcategory_id?: string | null;
  active_hub_id?: string | null;
  is_public: boolean;
  is_verified: boolean;
  has_active_primary_location: boolean;
  discovery_category?: DiscoveryCategory | null;
  discovery_subcategory?: DiscoverySubcategory | null;
  active_hub?: DiscoveryHub | null;
}

export interface UpdateMerchantDiscoveryProfileRequest {
  discovery_category_id?: string | null;
  discovery_subcategory_id?: string | null;
  active_hub_id?: string | null;
  is_public?: boolean;
}

export interface PublicMerchantLocationSummary {
  id: string;
  label: string;
  full_address: string;
  latitude: number;
  longitude: number;
}

export interface PublicMerchantSearchItem {
  merchant_id: string;
  store_name: string;
  store_description: string;
  discovery_category?: DiscoveryCategory | null;
  discovery_subcategory?: DiscoverySubcategory | null;
  active_hub?: DiscoveryHub | null;
  primary_location?: PublicMerchantLocationSummary | null;
  distance_meters?: number | null;
}

export interface MerchantSearchPagination {
  page: number;
  page_size: number;
  total: number;
}

export interface SearchPublicMerchantsData {
  merchants: PublicMerchantSearchItem[];
  pagination: MerchantSearchPagination;
}

export interface SearchPublicMerchantsParams {
  keyword?: string;
  category_id?: string;
  category_slug?: string;
  subcategory_id?: string;
  subcategory_slug?: string;
  hub_id?: string;
  hub_slug?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  page?: number;
  page_size?: number;
}

export interface ListDiscoveryCategoriesData {
  categories: DiscoveryCategory[];
}

export interface ListDiscoverySubcategoriesData {
  subcategories: DiscoverySubcategory[];
}

export interface ListDiscoveryHubsData {
  hubs: DiscoveryHub[];
}

export type GetMerchantDiscoveryProfileResponse =
  ApiSuccessResponse<MerchantDiscoveryProfile>;
export type UpdateMerchantDiscoveryProfileResponse =
  ApiSuccessResponse<MerchantDiscoveryProfile>;
export type ListDiscoveryCategoriesResponse =
  ApiSuccessResponse<ListDiscoveryCategoriesData>;
export type ListDiscoverySubcategoriesResponse =
  ApiSuccessResponse<ListDiscoverySubcategoriesData>;
export type ListDiscoveryHubsResponse =
  ApiSuccessResponse<ListDiscoveryHubsData>;
export type SearchPublicMerchantsResponse =
  ApiSuccessResponse<SearchPublicMerchantsData>;

const buildSearchQuery = (params?: SearchPublicMerchantsParams) => {
  if (!params) return "";

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const str = query.toString();
  return str ? `?${str}` : "";
};

export const discoveryApi = {
  listCategories: () =>
    request<ListDiscoveryCategoriesData>("/api/v1/discovery/categories", {
      method: "GET",
      requireAuth: true,
    }) as Promise<ListDiscoveryCategoriesResponse>,

  listSubcategories: () =>
    request<ListDiscoverySubcategoriesData>("/api/v1/discovery/subcategories", {
      method: "GET",
      requireAuth: true,
    }) as Promise<ListDiscoverySubcategoriesResponse>,

  listHubs: () =>
    request<ListDiscoveryHubsData>("/api/v1/discovery/hubs", {
      method: "GET",
      requireAuth: true,
    }) as Promise<ListDiscoveryHubsResponse>,

  searchPublicMerchants: (params?: SearchPublicMerchantsParams) =>
    request<SearchPublicMerchantsData>(
      `/api/v1/merchants${buildSearchQuery(params)}`,
      {
        method: "GET",
        requireAuth: true,
      }
    ) as Promise<SearchPublicMerchantsResponse>,

  getMerchantDiscoveryProfile: () =>
    request<MerchantDiscoveryProfile>("/api/v1/merchant/discovery-profile", {
      method: "GET",
      requireAuth: true,
    }) as Promise<GetMerchantDiscoveryProfileResponse>,

  updateMerchantDiscoveryProfile: (
    body: UpdateMerchantDiscoveryProfileRequest
  ) =>
    request<MerchantDiscoveryProfile>("/api/v1/merchant/discovery-profile", {
      method: "PATCH",
      requireAuth: true,
      body,
    }) as Promise<UpdateMerchantDiscoveryProfileResponse>,
};
