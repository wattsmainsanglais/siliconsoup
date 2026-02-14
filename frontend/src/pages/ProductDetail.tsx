import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products as productsApi, imageUrl } from '../api/client'
import type { Product, OptionValue } from '../api/types'
import { formatPrice } from '../utils/price'
import { useCart } from '../context/CartContext'
import OptionSelector from '../components/OptionSelector'

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Map<string, OptionValue>>(new Map())
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function load() {
      try {
        const p = await productsApi.get(slug!)
        setProduct(p)
        // Pre-select default options
        const defaults = new Map<string, OptionValue>()
        p.option_groups?.forEach((group) => {
          const defaultVal = group.values?.find((v) => v.is_default)
          if (defaultVal) {
            defaults.set(group.id, defaultVal)
          } else if (group.required && group.values?.length) {
            defaults.set(group.id, group.values[0])
          }
        })
        setSelectedOptions(defaults)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-grey-text">Loading...</div>
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
        <Link to="/shop" className="text-primary hover:text-primary-hover">
          &larr; Back to shop
        </Link>
      </div>
    )
  }

  const optionsTotal = Array.from(selectedOptions.values()).reduce(
    (sum, opt) => sum + opt.price_modifier_pence,
    0
  )
  const totalPrice = product.base_price_pence + optionsTotal

  const handleOptionChange = (groupId: string, value: OptionValue | null) => {
    setSelectedOptions((prev) => {
      const next = new Map(prev)
      if (value) {
        next.set(groupId, value)
      } else {
        next.delete(groupId)
      }
      return next
    })
  }

  const handleAddToCart = () => {
    addItem(product, Array.from(selectedOptions.values()), quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const mainImage = product.images?.[0]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-grey-text mb-6">
        <Link to="/shop" className="hover:text-primary">Shop</Link>
        {product.category_name && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/shop?category=${product.category_slug}`} className="hover:text-primary">
              {product.category_name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-dark">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="bg-grey-bg rounded-lg overflow-hidden aspect-square">
          {mainImage && !imgError ? (
            <img
              src={imageUrl(mainImage.url)}
              alt={mainImage.alt || product.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-grey-text">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2">{product.name}</h1>

          {product.short_description && (
            <p className="text-grey-text mb-4">{product.short_description}</p>
          )}

          {/* Price */}
          <div className="text-3xl font-bold text-primary mb-6">
            {formatPrice(totalPrice)}
          </div>

          {product.description && (
            <div className="text-sm text-dark leading-relaxed mb-6 whitespace-pre-line">
              {product.description}
            </div>
          )}

          {/* Option selectors */}
          {product.option_groups?.map((group) => (
            <OptionSelector
              key={group.id}
              group={group}
              selected={selectedOptions.get(group.id) ?? null}
              onChange={(val) => handleOptionChange(group.id, val)}
            />
          ))}

          {/* Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-dark mb-1">Quantity</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-dark hover:bg-gray-100"
              >
                -
              </button>
              <span className="w-12 text-center font-medium text-dark">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-dark hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
              added
                ? 'bg-green-600 text-white'
                : 'bg-primary text-dark hover:bg-primary-hover'
            }`}
          >
            {added ? 'Added to Cart!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
