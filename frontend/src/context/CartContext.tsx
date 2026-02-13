import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Product, OptionValue } from '../api/types'

export interface CartItem {
  product: Product
  selectedOptions: OptionValue[]
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, selectedOptions: OptionValue[], quantity: number) => void
  removeItem: (index: number) => void
  updateQuantity: (index: number, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPence: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'siliconsoup-cart'

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function calcItemPrice(item: CartItem): number {
  const optionsTotal = item.selectedOptions.reduce(
    (sum, opt) => sum + opt.price_modifier_pence,
    0
  )
  return (item.product.base_price_pence + optionsTotal) * item.quantity
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback(
    (product: Product, selectedOptions: OptionValue[], quantity: number) => {
      setItems((prev) => [...prev, { product, selectedOptions, quantity }])
    },
    []
  )

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPence = items.reduce((sum, item) => sum + calcItemPrice(item), 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPence }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
