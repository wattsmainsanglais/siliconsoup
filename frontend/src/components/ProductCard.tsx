import { Link } from 'react-router-dom'
import type { Product } from '../api/types'
import { imageUrl } from '../api/client'
import { formatPrice } from '../utils/price'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const image = product.images?.[0]

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-border">
      {/* Product Image */}
      <div className="aspect-square bg-grey-bg overflow-hidden flex items-center justify-center p-6">
        {image ? (
          <img
            src={imageUrl(image.url)}
            alt={image.alt || product.name}
            className="w-60 h-60 object-contain"
          />
        ) : (
          <div className="w-60 h-60 flex items-center justify-center text-grey-text">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-8 pt-6">
        {/* Category */}
        {product.category_name && (
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2" style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            lineHeight: '16px',
            letterSpacing: '-0.5px'
          }}>
            {product.category_name}
          </p>
        )}

        {/* Product Name */}
        <Link to={`/shop/${product.slug}`}>
          <h3 className="font-normal text-dark text-lg leading-tight mb-2 hover:text-primary transition-colors" style={{ 
            fontFamily: 'var(--font-heading)',
            fontSize: '18px',
            lineHeight: '28px',
            letterSpacing: '-0.5px'
          }}>
            {product.name}
          </h3>
        </Link>

        {/* Short Description */}
        {product.short_description && (
          <p className="text-sm text-grey-text mb-4 line-clamp-2" style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '-0.5px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {product.short_description}
          </p>
        )}

        {/* Price and Add Button */}
        <div className="flex items-center justify-between mt-6">
          <span className="text-primary font-normal text-2xl" style={{ 
            fontFamily: 'var(--font-heading)',
            fontSize: '24px',
            lineHeight: '32px',
            letterSpacing: '-0.5px'
          }}>
            {formatPrice(product.base_price_pence)}
          </span>
          <Link 
            to={`/shop/${product.slug}`}
            className="flex items-center gap-2 bg-dark text-white px-4 py-2 rounded hover:bg-primary hover:text-dark transition-colors"
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0.65625C0 0.292578 0.292578 0 0.65625 0H1.90039C2.50195 0 3.03516 0.35 3.28398 0.875H14.5223C15.2414 0.875 15.7664 1.55859 15.5777 2.25313L14.4566 6.41758C14.2242 7.27617 13.4449 7.875 12.5563 7.875H4.66758L4.81523 8.6543C4.87539 8.96328 5.14609 9.1875 5.46055 9.1875H13.3438C13.7074 9.1875 14 9.48008 14 9.84375C14 10.2074 13.7074 10.5 13.3438 10.5H5.46055C4.51445 10.5 3.70234 9.82734 3.52734 8.90039L2.11641 1.49023C2.09727 1.38633 2.00703 1.3125 1.90039 1.3125H0.65625C0.292578 1.3125 0 1.01992 0 0.65625ZM3.5 12.6875C3.5 12.5151 3.53395 12.3445 3.59991 12.1852C3.66587 12.026 3.76255 11.8813 3.88442 11.7594C4.0063 11.6375 4.15099 11.5409 4.31023 11.4749C4.46947 11.4089 4.64014 11.375 4.8125 11.375C4.98486 11.375 5.15553 11.4089 5.31477 11.4749C5.47401 11.5409 5.6187 11.6375 5.74058 11.7594C5.86245 11.8813 5.95913 12.026 6.02509 12.1852C6.09105 12.3445 6.125 12.5151 6.125 12.6875C6.125 12.8599 6.09105 13.0305 6.02509 13.1898C5.95913 13.349 5.86245 13.4937 5.74058 13.6156C5.6187 13.7375 5.47401 13.8341 5.31477 13.9001C5.15553 13.9661 4.98486 14 4.8125 14C4.64014 14 4.46947 13.9661 4.31023 13.9001C4.15099 13.8341 4.0063 13.7375 3.88442 13.6156C3.76255 13.4937 3.66587 13.349 3.59991 13.1898C3.53395 13.0305 3.5 12.8599 3.5 12.6875ZM12.6875 11.375C13.0356 11.375 13.3694 11.5133 13.6156 11.7594C13.8617 12.0056 14 12.3394 14 12.6875C14 13.0356 13.8617 13.3694 13.6156 13.6156C13.3694 13.8617 13.0356 14 12.6875 14C12.3394 14 12.0056 13.8617 11.7594 13.6156C11.5133 13.3694 11.375 13.0356 11.375 12.6875C11.375 12.3394 11.5133 12.0056 11.7594 11.7594C12.0056 11.5133 12.3394 11.375 12.6875 11.375ZM6.89062 4.375C6.89062 4.67578 7.13672 4.92188 7.4375 4.92188H8.64062V6.125C8.64062 6.42578 8.88672 6.67188 9.1875 6.67188C9.48828 6.67188 9.73438 6.42578 9.73438 6.125V4.92188H10.9375C11.2383 4.92188 11.4844 4.67578 11.4844 4.375C11.4844 4.07422 11.2383 3.82812 10.9375 3.82812H9.73438V2.625C9.73438 2.32422 9.48828 2.07812 9.1875 2.07812C8.88672 2.07812 8.64062 2.32422 8.64062 2.625V3.82812H7.4375C7.13672 3.82812 6.89062 4.07422 6.89062 4.375Z" fill="white"/>
            </svg>
            <span className="text-sm font-medium" style={{ 
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              lineHeight: '17px',
              letterSpacing: '-0.5px'
            }}>
              Add
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
