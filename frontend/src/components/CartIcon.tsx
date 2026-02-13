import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function CartIcon() {
  const { totalItems } = useCart()

  return (
    <Link to="/cart" className="relative inline-flex items-center p-2 text-white hover:text-primary transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-dark text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Link>
  )
}
