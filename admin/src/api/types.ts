// API Types matching Go backend (UUIDs as strings)

export interface Category {
  id: string;
  site_id: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  children?: Category[];
}

export interface OptionGroup {
  id: string;
  site_id: string;
  name: string;
  display_name: string;
  type: string;
  created_at: string;
  updated_at?: string;
  values?: OptionValue[];
}

export interface OptionValue {
  id: string;
  option_group_id: string;
  value: string;
  display_name: string;
  price_modifier_pence: number;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  site_id?: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  category_id?: string | null;
  category_slug?: string;
  category_name?: string;
  base_price_pence: number;
  status: string;
  featured?: boolean;
  has_options?: boolean;
  created_at?: string;
  updated_at?: string;
  images?: ProductImage[];
  option_groups?: OptionGroup[];
}

export interface ProductImage {
  id?: string;
  product_id?: string;
  url: string;
  alt: string;
  sort_order: number;
  created_at?: string;
}

export interface ShippingZone {
  id: string;
  site_id: string;
  name: string;
  countries: string[];
  base_rate_pence: number;
  per_item_rate_pence: number;
  free_threshold_pence: number | null;
  created_at: string;
  updated_at?: string;
}

// Request types
export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface CreateOptionGroupRequest {
  name: string;
  display_name: string;
  type: string;
}

export interface CreateOptionValueRequest {
  option_group_id: string;
  value: string;
  display_name: string;
  price_modifier_pence?: number;
  sort_order?: number;
}

export interface CreateProductRequest {
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  category_id?: string | null;
  base_price_pence: number;
  status?: string;
}
