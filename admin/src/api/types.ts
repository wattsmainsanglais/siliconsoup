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
  type: string;
  required: boolean;
  created_at: string;
  updated_at?: string;
  values?: OptionValue[];
}

export interface OptionValue {
  id: string;
  option_group_id: string;
  value: string;
  label: string;
  price_modifier_pence: number;
  sort_order: number;
  is_default: boolean;
  image?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Dimensions {
  length_mm: number;
  width_mm: number;
  height_mm: number;
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
  weight_grams?: number | null;
  dimensions?: Dimensions | null;
  status: string;
  featured?: boolean;
  has_options?: boolean;
  created_at?: string;
  updated_at?: string;
  images?: ProductImage[];
  option_groups?: OptionGroup[];
}

export interface ProductFile {
  id: string;
  product_id: string;
  title: string;
  type: 'pdf' | 'url';
  url: string;
  sort_order: number;
  created_at: string;
}

export interface Review {
  id: string;
  site_id: string;
  product_id: string;
  customer_email: string;
  display_name: string;
  rating: number;
  comment: string;
  status: 'published' | 'removed';
  created_at: string;
  product_name?: string;
  product_slug?: string;
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

export interface StoreImage {
  id: string;
  filename: string;
  url: string;
  alt: string;
  size_bytes?: number;
  created_at: string;
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
  type: string;
  required?: boolean;
}

export interface CreateOptionValueRequest {
  option_group_id: string;
  value: string;
  label: string;
  price_modifier_pence?: number;
  sort_order?: number;
  image?: string | null;
}

export interface CreateProductRequest {
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  category_id?: string | null;
  base_price_pence: number;
  weight_grams?: number | null;
  dimensions?: Dimensions | null;
  images?: ProductImage[];
  status?: string;
  featured?: boolean;
}
