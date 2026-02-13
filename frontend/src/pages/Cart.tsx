import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { shippingZones, imageUrl } from '../api/client'
import type { ShippingZone } from '../api/types'
import { formatPrice } from '../utils/price'

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalPence } = useCart()
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [selectedZone, setSelectedZone] = useState<string>('')

  useEffect(() => {
    shippingZones.list().then(setZones).catch(console.error)
  }, [])

  const zone = zones.find((z) => z.id === selectedZone)
  const shippingPence = zone
    ? zone.base_rate_pence +
      zone.per_item_rate_pence * items.reduce((sum, item) => sum + item.quantity, 0)
    : 0
  const freeShipping = zone?.free_threshold_pence && totalPence >= zone.free_threshold_pence
  const finalShipping = freeShipping ? 0 : shippingPence

  function itemPrice(index: number): number {
    const item = items[index]
    const optionsTotal = item.selectedOptions.reduce(
      (sum, opt) => sum + opt.price_modifier_pence,
      0
    )
    return (item.product.base_price_pence + optionsTotal) * item.quantity
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-dark mb-4">Your Cart</h1>
        <p className="text-grey-text mb-6">Your cart is empty.</p>
        <Link
          to="/shop"
          className="inline-block bg-primary text-dark font-bold px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors"
        >
          Browse Shop
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-dark">Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      {/* Cart items */}
      <div className="space-y-4 mb-8">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-4"
          >
            {/* Image */}
            <div className="w-20 h-20 bg-grey-bg rounded-lg overflow-hidden flex-shrink-0">
              {item.product.images?.[0] ? (
                <img
                  src={imageUrl(item.product.images[0].url)}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-grey-text text-xs">
                  No img
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/shop/${item.product.slug}`}
                className="font-semibold text-dark hover:text-primary transition-colors"
              >
                {item.product.name}
              </Link>
              {item.selectedOptions.length > 0 && (
                <p className="text-xs text-grey-text mt-1">
                  {item.selectedOptions.map((opt) => opt.label).join(', ')}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(index, item.quantity - 1)}
                className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-dark hover:bg-gray-100 text-sm"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-medium text-dark">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(index, item.quantity + 1)}
                className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-dark hover:bg-gray-100 text-sm"
              >
                +
              </button>
            </div>

            {/* Price + remove */}
            <div className="flex items-center gap-4">
              <span className="font-bold text-dark whitespace-nowrap">
                {formatPrice(itemPrice(index))}
              </span>
              <button
                onClick={() => removeItem(index)}
                className="text-grey-text hover:text-red-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Shipping estimate */}
      {zones.length > 0 && (
        <div className="bg-grey-bg rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-dark mb-2">
            Shipping estimate
          </label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-dark bg-white"
          >
            <option value="">Select delivery region...</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Totals */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-grey-text">Subtotal</span>
          <span className="font-medium text-dark">{formatPrice(totalPence)}</span>
        </div>
        {zone && (
          <div className="flex justify-between text-sm mb-2">
            <span className="text-grey-text">
              Shipping ({zone.name})
              {freeShipping && <span className="text-green-600 ml-1">FREE</span>}
            </span>
            <span className="font-medium text-dark">
              {freeShipping ? formatPrice(0) : formatPrice(finalShipping)}
            </span>
          </div>
        )}
        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
          <span className="font-bold text-dark text-lg">Total</span>
          <span className="font-bold text-primary text-lg">
            {formatPrice(totalPence + finalShipping)}
          </span>
        </div>

        <button
          className="w-full mt-6 bg-primary text-dark font-bold py-3 rounded-lg hover:bg-primary-hover transition-colors text-lg"
          onClick={() => alert('Checkout coming soon — PayPal integration in progress!')}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  )
}
