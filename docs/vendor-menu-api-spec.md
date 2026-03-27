# Vendor Menu API Specification (Draft v1)

## 1. 目的與範圍

此文件定義攤商端「菜單管理」所需後端 API 規格，對應前端目前已實作的功能：

- 取得菜單清單（含篩選）
- 新增品項
- 編輯品項
- 上下架切換
- 刪除品項（軟刪除）

本規格延續現有專案 API 風格：

- 路徑前綴：`/api/v1/*`
- 成功回應：`{ data, meta }`
- 失敗回應：`{ error, meta }`
- `meta.request_id` 作為追蹤 ID

## 2. 鑑權與角色

- 所有端點都需要 JWT（與既有 `/api/v1` 一致）
- 所有端點都需 `merchant` 角色
- 只能操作「自己的」菜單資料（`owner_id = token user_id`）

## 3. 資料模型

## 3.1 MenuItem

```json
{
  "id": "uuid",
  "merchant_id": "uuid",
  "name": "炭烤雞腿飯",
  "description": "炭香雞腿搭配季節時蔬與溏心蛋。",
  "category": "main",
  "price": 120,
  "currency": "TWD",
  "prep_minutes": 8,
  "is_available": true,
  "is_popular": true,
  "display_order": 1,
  "image_url": "https://.../menu/1.jpg",
  "created_at": "2026-03-10T12:34:56Z",
  "updated_at": "2026-03-10T12:34:56Z"
}
```

### 欄位說明

- `category`：`main | snack | drink | dessert`
- `price`：整數（最小單位元，TWD 目前可直接視為元）
- `display_order`：同一 merchant 的排序值，數字越小越前
- `image_url`：可選，若後續有上傳服務再串

## 4. API 端點

## 4.1 取得菜單清單

- `GET /api/v1/menus/merchant`

### Query Params

- `category` (optional): `main|snack|drink|dessert`
- `is_available` (optional): `true|false`
- `keyword` (optional): 模糊搜尋 `name/description`
- `page` (optional, default `1`)
- `page_size` (optional, default `20`, max `100`)

### 200 Response

```json
{
  "data": {
    "items": [
      {
        "id": "0e4f0c7c-42f8-4db7-a73a-0ef73f372f08",
        "merchant_id": "1f0f7d1c-5d9f-4b96-9c0d-8d8e1c2f9a88",
        "name": "炭烤雞腿飯",
        "description": "炭香雞腿搭配季節時蔬與溏心蛋。",
        "category": "main",
        "price": 120,
        "currency": "TWD",
        "prep_minutes": 8,
        "is_available": true,
        "is_popular": true,
        "display_order": 1,
        "image_url": null,
        "created_at": "2026-03-10T10:00:00Z",
        "updated_at": "2026-03-10T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1
    }
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

## 4.2 新增品項

- `POST /api/v1/menus/merchant`

### Request Body

```json
{
  "name": "椒麻鹹酥雞",
  "description": "現炸外酥內嫩，灑上特調椒麻粉。",
  "category": "snack",
  "price": 85,
  "currency": "TWD",
  "prep_minutes": 6,
  "is_available": true,
  "is_popular": true,
  "display_order": 2,
  "image_url": null
}
```

### 驗證規則

- `name`: required, 1~80 字
- `description`: optional, <= 500 字
- `category`: required enum
- `price`: required, integer, `> 0`
- `prep_minutes`: required, integer, `> 0`

### 201 Response

```json
{
  "data": {
    "id": "uuid",
    "merchant_id": "uuid",
    "name": "椒麻鹹酥雞",
    "description": "現炸外酥內嫩，灑上特調椒麻粉。",
    "category": "snack",
    "price": 85,
    "currency": "TWD",
    "prep_minutes": 6,
    "is_available": true,
    "is_popular": true,
    "display_order": 2,
    "image_url": null,
    "created_at": "2026-03-10T10:00:00Z",
    "updated_at": "2026-03-10T10:00:00Z"
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

## 4.3 更新品項（完整更新）

- `PUT /api/v1/menus/merchant/:id`

### Request Body

與 `POST` 相同，採完整覆蓋。

### 200 Response

`data` 回傳更新後的 `MenuItem`。

## 4.4 切換上下架（部分更新）

- `PATCH /api/v1/menus/merchant/:id/status`

### Request Body

```json
{
  "is_available": false
}
```

### 200 Response

`data` 回傳更新後的 `MenuItem`。

## 4.5 重新排序（可選，但建議 v1 就納入）

- `PATCH /api/v1/menus/merchant/reorder`

### Request Body

```json
{
  "items": [
    { "id": "uuid-1", "display_order": 1 },
    { "id": "uuid-2", "display_order": 2 }
  ]
}
```

### 200 Response

```json
{
  "data": {
    "updated_count": 2
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

## 4.6 刪除品項

- `DELETE /api/v1/menus/merchant/:id`

### 200 Response

```json
{
  "data": {
    "message": "Menu item deleted"
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

> 建議使用 soft delete（`deleted_at`）以保留營運分析資料。

## 5. 錯誤回應格式

沿用現有格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": null
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

### 建議錯誤碼

- `VALIDATION_ERROR`
- `INVALID_MENU_CATEGORY`
- `MENU_ITEM_NOT_FOUND`
- `MENU_ITEM_ALREADY_EXISTS`
- `FORBIDDEN_RESOURCE_OWNER`
- `UNAUTHORIZED`
- `INTERNAL_ERROR`

## 6. 前端目前依賴欄位（最低需求）

前端攤商菜單頁最少需要以下欄位即可正常運作：

- `id`
- `name`
- `category`
- `price`
- `description`
- `prep_minutes`
- `is_available`
- `is_popular`

## 7. 建議資料表（參考）

`merchant_menu_items`

- `id` UUID PK
- `merchant_id` UUID FK -> users(id)
- `name` TEXT NOT NULL
- `description` TEXT NULL
- `category` TEXT NOT NULL
- `price` INT NOT NULL
- `currency` TEXT NOT NULL DEFAULT 'TWD'
- `prep_minutes` INT NOT NULL
- `is_available` BOOL NOT NULL DEFAULT true
- `is_popular` BOOL NOT NULL DEFAULT false
- `display_order` INT NOT NULL DEFAULT 0
- `image_url` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL
- `deleted_at` TIMESTAMP NULL

索引建議：

- `(merchant_id, deleted_at)`
- `(merchant_id, is_available, deleted_at)`
- `(merchant_id, display_order, deleted_at)`

## 8. 與目前前端原型對齊說明

目前前端已實作：

- 本地假資料 CRUD（新增/編輯）
- 上下架切換
- 分類篩選
- 基本統計（總品項、上架中、已下架）

後續串接時，前端可直接替換成上述 API，不需大幅改版 UI。
