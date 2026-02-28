import type { Product, Category, ShippingZone, Review } from './types'

const API_BASE = import.meta.env.VITE_API_URL

export function imageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = body?.error || `HTTP ${response.status}`
    const err = new Error(message)
    ;(err as Error & { status: number }).status = response.status
    throw err
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

interface ReviewsResponse {
  reviews: Review[]
  count: number
}

export const reviews = {
  list: (slug: string): Promise<ReviewsResponse> =>
    request<ReviewsResponse>(`/api/products/${slug}/reviews`),
  submit: (slug: string, data: {
    customer_email: string
    display_name: string
    rating: number
    comment: string
  }): Promise<Review> =>
    request<Review>(`/api/products/${slug}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
