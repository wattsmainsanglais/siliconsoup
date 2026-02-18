import type { Product, Category, ShippingZone } from './types'

const API_BASE = import.meta.env.VITE_API_URL

export function imageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  return response.json()
}

interface ProductsResponse {
  products: Product[]
  count: number
}

interface CategoriesResponse {
  categories: Category[]
  count: number
}

interface ShippingZonesResponse {
  shipping_zones: ShippingZone[]
  count: number
}

export const products = {
  list: async (): Promise<Product[]> => {
    const res = await request<ProductsResponse>('/api/products')
    return res.products
  },
  get: (slug: string): Promise<Product> =>
    request<Product>(`/api/products/${slug}`),
}

export const categories = {
  tree: async (): Promise<Category[]> => {
    const res = await request<CategoriesResponse>('/api/categories?tree=true')
    return res.categories
  },
}

export const shippingZones = {
  list: async (): Promise<ShippingZone[]> => {
    const res = await request<ShippingZonesResponse>('/api/shipping-zones')
    return res.shipping_zones
  },
}
