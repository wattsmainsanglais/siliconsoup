// API Client for Silicon Soup backend

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let currentSiteId = '';
export function setCurrentSiteId(id: string) {
  currentSiteId = id;
}

let currentApiKey = '';
export function setApiKey(key: string) {
  currentApiKey = key;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (currentSiteId) headers['X-Site-ID'] = currentSiteId;
  if (currentApiKey) headers['Authorization'] = `Bearer ${currentApiKey}`;
  return headers;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  // Handle empty responses (DELETE often returns 204)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

// Response wrapper types
interface CategoriesResponse {
  categories: import('./types').Category[];
  count: number;
}

interface ProductsResponse {
  products: import('./types').Product[];
  count: number;
}

interface ShippingZonesResponse {
  shipping_zones: import('./types').ShippingZone[];
  count: number;
}

// Categories
export const categories = {
  list: async () => {
    const res = await request<CategoriesResponse>('/api/categories');
    return res.categories;
  },
  tree: async () => {
    const res = await request<CategoriesResponse>('/api/categories?tree=true');
    return res.categories;
  },
  create: (data: import('./types').CreateCategoryRequest) =>
    request<import('./types').Category>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import('./types').CreateCategoryRequest>) =>
    request<import('./types').Category>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/admin/categories/${id}`, { method: 'DELETE' }),
};

// Option Groups
interface OptionGroupsResponse {
  option_groups: import('./types').OptionGroup[];
  count: number;
}

export const optionGroups = {
  list: async () => {
    const res = await request<OptionGroupsResponse>('/api/admin/option-groups');
    return res.option_groups;
  },
  create: (data: import('./types').CreateOptionGroupRequest) =>
    request<import('./types').OptionGroup>('/api/admin/option-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import('./types').CreateOptionGroupRequest>) =>
    request<import('./types').OptionGroup>(`/api/admin/option-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/admin/option-groups/${id}`, { method: 'DELETE' }),
};

// Option Values
export const optionValues = {
  create: (data: import('./types').CreateOptionValueRequest) =>
    request<import('./types').OptionValue>('/api/admin/option-values', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import('./types').CreateOptionValueRequest>) =>
    request<import('./types').OptionValue>(`/api/admin/option-values/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/admin/option-values/${id}`, { method: 'DELETE' }),
};

// Products
interface ProductOptionsResponse {
  option_groups: import('./types').OptionGroup[];
  count: number;
}

export const products = {
  list: async () => {
    // Use admin endpoint to get ALL products (including drafts)
    const res = await request<ProductsResponse>('/api/admin/products');
    return res.products;
  },
  get: (slug: string) => request<import('./types').Product>(`/api/products/${slug}`),
  create: (data: import('./types').CreateProductRequest) =>
    request<import('./types').Product>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import('./types').CreateProductRequest>) =>
    request<import('./types').Product>(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  // Product Options
  getOptions: async (productId: string) => {
    const res = await request<ProductOptionsResponse>(`/api/admin/products/${productId}/options`);
    return res.option_groups || [];
  },
  addOption: (productId: string, optionGroupId: string) =>
    request<void>('/api/admin/product-options', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, option_group_id: optionGroupId }),
    }),
  removeOption: (productId: string, optionGroupId: string) =>
    request<void>(`/api/admin/product-options/${productId}/${optionGroupId}`, {
      method: 'DELETE',
    }),
};

// Images (legacy product upload)
export const images = {
  upload: async (productId: string, file: File): Promise<import('./types').ProductImage> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('product_id', productId.toString());

    const response = await fetch(`${API_BASE}/api/admin/upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

// Image Store (central)
interface ImageStoreResponse {
  images: import('./types').StoreImage[];
  count: number;
}

export const imageStore = {
  list: async () => {
    const res = await request<ImageStoreResponse>('/api/admin/images');
    return res.images;
  },
  upload: async (file: File): Promise<import('./types').StoreImage> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/api/admin/images`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  },
  delete: (id: string) =>
    request<void>(`/api/admin/images/${id}`, { method: 'DELETE' }),
};

// Product Files
interface ProductFilesResponse {
  files: import('./types').ProductFile[];
  count: number;
}

export const productFiles = {
  list: async (productId: string) => {
    const res = await request<ProductFilesResponse>(`/api/admin/products/${productId}/files`);
    return res.files;
  },
  create: (productId: string, data: { title: string; type: 'pdf' | 'url'; url: string; sort_order?: number }) =>
    request<import('./types').ProductFile>(`/api/admin/products/${productId}/files`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (fileId: string) =>
    request<void>(`/api/admin/product-files/${fileId}`, { method: 'DELETE' }),
  uploadPdf: async (file: File): Promise<{ filename: string; url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/api/admin/files/upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    return response.json();
  },
};

// Reviews
interface ReviewsResponse {
  reviews: import('./types').Review[];
  count: number;
}

export const reviews = {
  list: async (status?: string) => {
    const url = status ? `/api/admin/reviews?status=${status}` : '/api/admin/reviews';
    const res = await request<ReviewsResponse>(url);
    return res.reviews;
  },
  remove: (id: string) =>
    request<void>(`/api/admin/reviews/${id}`, { method: 'DELETE' }),
};

// Shipping Zones
export const shippingZones = {
  list: async () => {
    const res = await request<ShippingZonesResponse>('/api/shipping-zones');
    return res.shipping_zones;
  },
};

// Sites
interface SitesResponse {
  sites: import('./types').Site[];
  count: number;
}

export const sites = {
  list: async () => {
    const res = await request<SitesResponse>('/api/admin/sites');
    return res.sites;
  },
};
