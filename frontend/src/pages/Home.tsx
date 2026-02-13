import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { products, categories as categoriesApi } from '../api/client'
import type { Product, Category } from '../api/types'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [allProducts, allCats] = await Promise.all([
          products.list(),
          categoriesApi.tree(),
        ])
        // Show featured products first, otherwise take first 4 active
        const active = allProducts.filter((p) => p.status === 'active')
        const featuredItems = active.filter((p) => p.featured)
        setFeatured(featuredItems.length > 0 ? featuredItems.slice(0, 4) : active.slice(0, 4))
        setCats(allCats)
      } catch (err) {
        console.error('Failed to load homepage data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-dark text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-primary">Silicon</span>Soup
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Electronics components, antennas, and accessories — quality parts at great prices.
          </p>
          <Link
            to="/shop"
            className="inline-block bg-primary text-dark font-bold px-8 py-3 rounded-lg hover:bg-primary-hover transition-colors text-lg"
          >
            Browse Shop
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      {!loading && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-dark">Featured Products</h2>
            <Link to="/shop" className="text-primary hover:text-primary-hover font-medium text-sm">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {!loading && cats.length > 0 && (
        <section className="bg-grey-bg">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-dark mb-8 text-center">Shop by Category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {cats.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}`}
                  className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center group"
                >
                  <h3 className="text-lg font-semibold text-dark group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-sm text-grey-text mt-2">{cat.description}</p>
                  )}
                  {cat.children && cat.children.length > 0 && (
                    <p className="text-xs text-grey-text mt-3">
                      {cat.children.map((c) => c.name).join(' · ')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-grey-text">
          Loading...
        </div>
      )}
    </div>
  )
}
