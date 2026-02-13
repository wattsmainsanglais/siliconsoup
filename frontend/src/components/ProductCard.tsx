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
    <Link
      to={`/shop/${product.slug}`}
      className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
    >
      <div className="aspect-square bg-grey-bg overflow-hidden">
        {image ? (
          <img
            src={imageUrl(image.url)}
            alt={image.alt || product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-grey-text">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        {product.category_name && (
          <p className="text-xs text-grey-text uppercase tracking-wide mb-1">
            {product.category_name}
          </p>
        )}
        <h3 className="font-semibold text-dark text-sm leading-tight mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="text-xs text-grey-text mb-2 line-clamp-2">
            {product.short_description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold">
            {product.has_options ? 'From ' : ''}
            {formatPrice(product.base_price_pence)}
          </span>
          <span className="text-xs text-white bg-dark px-3 py-1 rounded-full group-hover:bg-primary group-hover:text-dark transition-colors">
            View
          </span>
        </div>
      </div>
    </Link>
  )
}
