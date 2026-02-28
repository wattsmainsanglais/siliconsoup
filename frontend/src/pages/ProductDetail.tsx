import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products as productsApi, reviews as reviewsApi, imageUrl } from '../api/client'
import type { Product, OptionValue, Review } from '../api/types'
import { formatPrice } from '../utils/price'
import { useCart } from '../context/CartContext'
import OptionSelector from '../components/OptionSelector'

type Tab = 'description' | 'additional' | 'reviews'

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400">
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl leading-none transition-colors ${
            n <= (hover || value) ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

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
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>('description')

  // Reviews
  const [productReviews, setProductReviews] = useState<Review[]>([])
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  const [reviewForm, setReviewForm] = useState({ customer_email: '', display_name: '', rating: 0, comment: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    async function load() {
      try {
        const p = await productsApi.get(slug!)
        setProduct(p)
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

  const loadReviews = async () => {
    if (!slug || reviewsLoaded) return
    try {
      const res = await reviewsApi.list(slug)
      setProductReviews(res.reviews)
    } catch {
      // Non-fatal — reviews just won't show
    } finally {
      setReviewsLoaded(true)
    }
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'reviews') loadReviews()
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || reviewForm.rating === 0) return
    setReviewSubmitting(true)
    setReviewError(null)
    try {
      const r = await reviewsApi.submit(slug, reviewForm)
      setProductReviews((prev) => [r, ...prev])
      setReviewSuccess(true)
      setReviewForm({ customer_email: '', display_name: '', rating: 0, comment: '' })
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 403) {
        setReviewError('Only verified purchasers can leave a review.')
      } else if (status === 409) {
        setReviewError('You have already reviewed this product.')
      } else {
        setReviewError(err instanceof Error ? err.message : 'Failed to submit review.')
      }
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-grey-text">Loading...</div>
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
        <Link to="/shop" className="text-primary hover:text-primary-hover">&larr; Back to shop</Link>
      </div>
    )
  }

  const optionsTotal = Array.from(selectedOptions.values()).reduce(
    (sum, opt) => sum + opt.price_modifier_pence, 0
  )
  const totalPrice = product.base_price_pence + optionsTotal

  const handleOptionChange = (groupId: string, value: OptionValue | null) => {
    setSelectedOptions((prev) => {
      const next = new Map(prev)
      if (value) next.set(groupId, value)
      else next.delete(groupId)
      return next
    })
  }

  const handleAddToCart = () => {
    addItem(product, Array.from(selectedOptions.values()), quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const images = product.images ?? []
  const mainImage = images[activeImageIndex] ?? images[0]
  const hasMultipleImages = images.length > 1

  const hasAdditionalInfo = product.weight_grams || product.dimensions || (product.files?.length ?? 0) > 0

  const tabLabel = (tab: Tab) => {
    if (tab === 'description') return 'Description'
    if (tab === 'additional') return 'Additional Info'
    return productReviews.length > 0 ? `Reviews (${productReviews.length})` : 'Reviews'
  }

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
        {/* Image Gallery */}
        <div>
          <div className="flex gap-3">
            {hasMultipleImages && (
              <div className="flex flex-col gap-2 shrink-0">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setActiveImageIndex(idx); setImgError(false) }}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === activeImageIndex ? 'border-primary' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={imageUrl(img.url)} alt={img.alt || `${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="bg-grey-bg rounded-lg overflow-hidden aspect-square flex-1">
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
          </div>

          {/* Selected Options Summary */}
          {selectedOptions.size > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-dark mb-2">Selected Options</h3>
              <div className="flex flex-wrap gap-2">
                {product.option_groups?.map((group) => {
                  const selected = selectedOptions.get(group.id)
                  if (!selected) return null
                  return (
                    <div key={group.id} className="flex items-center gap-2 bg-grey-bg rounded-lg px-3 py-2 text-sm">
                      {selected.image && (
                        <img src={imageUrl(selected.image)} alt={selected.label} className="w-10 h-10 rounded object-cover" />
                      )}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <span className="text-grey-text">{group.name}:</span>{' '}
                        <span className="text-dark font-medium">{selected.label}</span>
                        {selected.price_modifier_pence !== 0 && (
                          <span className="text-primary ml-1">(+{formatPrice(selected.price_modifier_pence)})</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2">{product.name}</h1>
          {product.short_description && (
            <p className="text-grey-text mb-4">{product.short_description}</p>
          )}
          <div className="text-3xl font-bold text-primary mb-6">{formatPrice(totalPrice)}</div>

          {product.option_groups?.map((group) => (
            <OptionSelector
              key={group.id}
              group={group}
              selected={selectedOptions.get(group.id) ?? null}
              onChange={(val) => handleOptionChange(group.id, val)}
            />
          ))}

          <div className="mb-6">
            <label className="block text-sm font-medium text-dark mb-1">Quantity</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-dark hover:bg-gray-100">-</button>
              <span className="w-12 text-center font-medium text-dark">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-dark hover:bg-gray-100">+</button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
              added ? 'bg-green-600 text-white' : 'bg-primary text-dark hover:bg-primary-hover'
            }`}
          >
            {added ? 'Added to Cart!' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-12">
        <div className="flex border-b border-gray-200">
          {(['description', 'additional', 'reviews'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary text-dark'
                  : 'border-transparent text-grey-text hover:text-dark'
              }`}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="py-8">
          {/* ── Description ── */}
          {activeTab === 'description' && (
            <div className="max-w-2xl">
              {product.description ? (
                <div className="text-dark leading-relaxed whitespace-pre-line">{product.description}</div>
              ) : (
                <p className="text-grey-text italic">No description available.</p>
              )}
            </div>
          )}

          {/* ── Additional Info ── */}
          {activeTab === 'additional' && (
            <div className="max-w-2xl">
              {!hasAdditionalInfo ? (
                <p className="text-grey-text italic">No additional information available.</p>
              ) : (
                <>
                  {(product.weight_grams || product.dimensions) && (
                    <table className="w-full text-sm mb-8 border-collapse">
                      <tbody>
                        {product.weight_grams && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 pr-6 text-grey-text font-medium w-40">Weight</td>
                            <td className="py-2 text-dark">{product.weight_grams}g</td>
                          </tr>
                        )}
                        {product.dimensions && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 pr-6 text-grey-text font-medium">Dimensions</td>
                            <td className="py-2 text-dark">
                              {product.dimensions.length_mm} × {product.dimensions.width_mm} × {product.dimensions.height_mm} mm
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {product.files && product.files.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-dark mb-3 uppercase tracking-wide">Downloads & Resources</h3>
                      <ul className="space-y-2">
                        {product.files.map((file) => (
                          <li key={file.id}>
                            <a
                              href={file.type === 'pdf' ? imageUrl(file.url) : file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium"
                            >
                              {file.type === 'pdf' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              )}
                              {file.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Reviews ── */}
          {activeTab === 'reviews' && (
            <div className="max-w-2xl">
              {/* Existing reviews */}
              {!reviewsLoaded ? (
                <p className="text-grey-text">Loading reviews…</p>
              ) : productReviews.length === 0 && !reviewSuccess ? (
                <p className="text-grey-text italic mb-8">No reviews yet. Be the first to review this product.</p>
              ) : (
                <div className="space-y-6 mb-10">
                  {productReviews.map((r) => (
                    <div key={r.id} className="border-b border-gray-100 pb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <StarDisplay rating={r.rating} />
                        <span className="font-medium text-dark text-sm">{r.display_name}</span>
                        <span className="text-grey-text text-xs ml-auto">
                          {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-dark text-sm leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit form */}
              {reviewSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm">
                  Thank you for your review!
                </div>
              ) : (
                <div className="bg-grey-bg rounded-xl p-6">
                  <h3 className="text-base font-semibold text-dark mb-4">Write a Review</h3>
                  <p className="text-xs text-grey-text mb-4">Only verified purchasers can submit a review.</p>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark mb-1">Rating</label>
                      <StarInput value={reviewForm.rating} onChange={(n) => setReviewForm({ ...reviewForm, rating: n })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark mb-1">Display Name</label>
                      <input
                        type="text"
                        required
                        value={reviewForm.display_name}
                        onChange={(e) => setReviewForm({ ...reviewForm, display_name: e.target.value })}
                        placeholder="Your name (shown publicly)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={reviewForm.customer_email}
                        onChange={(e) => setReviewForm({ ...reviewForm, customer_email: e.target.value })}
                        placeholder="Used to verify your purchase (not shown)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark mb-1">Review</label>
                      <textarea
                        required
                        rows={4}
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="What did you think of this product?"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    {reviewError && (
                      <p className="text-red-600 text-sm">{reviewError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={reviewSubmitting || reviewForm.rating === 0}
                      className="bg-primary text-dark font-semibold px-6 py-2 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
