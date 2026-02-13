import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { products as productsApi, categories as categoriesApi } from '../api/client'
import type { Product, Category } from '../api/types'
import ProductCard from '../components/ProductCard'

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeCategory = searchParams.get('category')

  useEffect(() => {
    async function load() {
      try {
        const [prods, categories] = await Promise.all([
          productsApi.list(),
          categoriesApi.tree(),
        ])
        setAllProducts(prods.filter((p) => p.status === 'active'))
        setCats(categories)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Flatten category tree to find all slugs under a parent
  function getCategorySlugs(categories: Category[], slug: string): string[] {
    const slugs: string[] = []
    for (const cat of categories) {
      if (cat.slug === slug) {
        slugs.push(cat.slug)
        if (cat.children) {
          for (const child of cat.children) {
            slugs.push(child.slug)
          }
        }
      }
      if (cat.children) {
        slugs.push(...getCategorySlugs(cat.children, slug))
      }
    }
    return slugs
  }

  const filtered = activeCategory
    ? allProducts.filter((p) => {
        const validSlugs = getCategorySlugs(cats, activeCategory)
        return p.category_slug && validSlugs.includes(p.category_slug)
      })
    : allProducts

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-grey-text">Loading...</div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-red-500">Error: {error}</div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-dark mb-8">Shop</h1>

      {/* Category filters */}
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSearchParams({})}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !activeCategory
                ? 'bg-primary text-dark'
                : 'bg-gray-100 text-grey-text hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {cats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSearchParams({ category: cat.slug })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.slug
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 text-grey-text hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-center text-grey-text py-12">No products found in this category.</p>
      )}
    </div>
  )
}
