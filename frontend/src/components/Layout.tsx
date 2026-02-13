import { NavLink, Outlet } from 'react-router-dom'
import CartIcon from './CartIcon'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-dark text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <NavLink to="/" className="text-xl font-bold tracking-tight">
            <span className="text-primary">Silicon</span>Soup
          </NavLink>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'text-primary font-medium' : 'hover:text-primary transition-colors'
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                isActive ? 'text-primary font-medium' : 'hover:text-primary transition-colors'
              }
            >
              Shop
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <CartIcon />
            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-white hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-3">
                <span className="text-primary">Silicon</span>Soup
              </h3>
              <p className="text-sm text-gray-400">
                Electronics components and accessories.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-400">
                Quick Links
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <NavLink to="/shop" className="text-gray-300 hover:text-primary transition-colors">
                    Shop
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/cart" className="text-gray-300 hover:text-primary transition-colors">
                    Cart
                  </NavLink>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-400">
                Contact
              </h4>
              <p className="text-sm text-gray-300">
                Get in touch for custom orders and enquiries.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} SiliconSoup. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
