export interface Category {
  id: string
  name: string
  slug: string
  description: string
  parent_id: string | null
  sort_order: number
  children?: Category[]
}

export interface OptionGroup {
  id: string
  name: string
  type: string
  required: boolean
  values?: OptionValue[]
}

export interface OptionValue {
  id: string
  option_group_id: string
  value: string
  label: string
  price_modifier_pence: number
  sort_order: number
  is_default: boolean
  image?: string
}

export interface Dimensions {
  length_mm: number
  width_mm: number
  height_mm: number
}

export interface ProductFile {
  id: string
  product_id: string
  title: string
  type: 'pdf' | 'url'
  url: string
  sort_order: number
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  display_name: string
  customer_email: string
  rating: number
  comment: string
  status: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  short_description?: string
  description?: string
  category_id?: string | null
  category_slug?: string
  category_name?: string
  base_price_pence: number
  weight_grams?: number | null
  dimensions?: Dimensions | null
  status: string
  featured?: boolean
  has_options?: boolean
  images?: ProductImage[]
  option_groups?: OptionGroup[]
  files?: ProductFile[]
}

export interface ProductImage {
  id?: string
  url: string
  alt: string
  sort_order: number
}

export interface ShippingZone {
  id: string
  name: string
  countries: string[]
  base_rate_pence: number
  per_item_rate_pence: number
  free_threshold_pence: number | null
}
