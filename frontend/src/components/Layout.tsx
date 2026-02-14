import { NavLink, Outlet, Link } from 'react-router-dom'
import CartIcon from './CartIcon'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-dark text-white sticky top-0 z-50 border-b border-dark-light">
        <div className="max-w-7xl mx-auto px-20 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-normal tracking-tight" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.7px' }}>
            <span className="text-primary">Silicon</span>
            <span className="text-white">Soup</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <NavLink
              to="/"
              end
              className="text-white hover:text-primary transition-colors"
            >
              Home
            </NavLink>
            <NavLink
              to="/shop"
              className="text-white hover:text-primary transition-colors"
            >
              Shop
            </NavLink>
            <span className="text-white hover:text-primary transition-colors cursor-pointer">
              About
            </span>
            <span className="text-white hover:text-primary transition-colors cursor-pointer">
              Contact
            </span>
          </nav>

          <div className="flex items-center gap-4">
            <button className="text-white hover:text-primary transition-colors">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.875 5C11.875 4.1712 11.5458 3.37634 10.9597 2.79029C10.3737 2.20424 9.5788 1.875 8.75 1.875C7.9212 1.875 7.12634 2.20424 6.54029 2.79029C5.95424 3.37634 5.625 4.1712 5.625 5C5.625 5.8288 5.95424 6.62366 6.54029 7.20971C7.12634 7.79576 7.9212 8.125 8.75 8.125C9.5788 8.125 10.3737 7.79576 10.9597 7.20971C11.5458 6.62366 11.875 5.8288 11.875 5ZM3.75 5C3.75 3.67392 4.27678 2.40215 5.21447 1.46447C6.15215 0.526784 7.42392 0 8.75 0C10.0761 0 11.3479 0.526784 12.2855 1.46447C13.2232 2.40215 13.75 3.67392 13.75 5C13.75 6.32608 13.2232 7.59785 12.2855 8.53553C11.3479 9.47322 10.0761 10 8.75 10C7.42392 10 6.15215 9.47322 5.21447 8.53553C4.27678 7.59785 3.75 6.32608 3.75 5ZM1.92578 18.125H15.5742C15.2266 15.6523 13.1016 13.75 10.5352 13.75H6.96484C4.39844 13.75 2.27344 15.6523 1.92578 18.125ZM0 18.8398C0 14.9922 3.11719 11.875 6.96484 11.875H10.5352C14.3828 11.875 17.5 14.9922 17.5 18.8398C17.5 19.4805 16.9805 20 16.3398 20H1.16016C0.519531 20 0 19.4805 0 18.8398Z" fill="currentColor"/>
              </svg>
            </button>
            <CartIcon />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white">
        <div className="max-w-7xl mx-auto px-20 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Company Info */}
            <div>
              <h3 className="text-2xl font-normal mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                <span className="text-primary">Silicon</span>
                <span className="text-white"> Soup</span>
              </h3>
              <p className="text-grey-light text-base leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)', lineHeight: '26px' }}>
                Your trusted UK supplier for quality electronics components. Specializing in RFID solutions, NFC technology, and Raspberry Pi accessories.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-dark-light flex items-center justify-center hover:bg-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.3553 4.741C14.3655 4.88313 14.3655 5.02528 14.3655 5.16741C14.3655 9.50241 11.066 14.4973 5.03553 14.4973C3.17766 14.4973 1.45178 13.9593 0 13.0253C0.263969 13.0557 0.51775 13.0659 0.791875 13.0659C2.32484 13.0659 3.73603 12.5481 4.86294 11.6649C3.42131 11.6344 2.21319 10.6903 1.79694 9.39075C2 9.42119 2.20303 9.4415 2.41625 9.4415C2.71066 9.4415 3.00509 9.40088 3.27919 9.32985C1.77666 9.02525 0.649719 7.70547 0.649719 6.11157V6.07097C1.08625 6.31463 1.59391 6.46691 2.13194 6.48719C1.24869 5.89835 0.670031 4.89329 0.670031 3.75622C0.670031 3.1471 0.832438 2.58872 1.11672 2.10141C2.73094 4.09125 5.15734 5.39072 7.87813 5.53288C7.82738 5.28922 7.79691 5.03544 7.79691 4.78163C7.79691 2.9745 9.25884 1.50244 11.0761 1.50244C12.0202 1.50244 12.873 1.89838 13.472 2.53797C14.2131 2.39585 14.9238 2.12172 15.5533 1.7461C15.3096 2.50754 14.7918 3.14713 14.1116 3.55319C14.7715 3.48216 15.4111 3.29938 15.9999 3.0456C15.5533 3.69532 14.9949 4.27397 14.3553 4.741Z" fill="white"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-dark-light flex items-center justify-center hover:bg-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.18437 12.4187C5.18437 12.4812 5.1125 12.5312 5.02187 12.5312C4.91875 12.5406 4.84688 12.4906 4.84688 12.4187C4.84688 12.3562 4.91875 12.3062 5.00938 12.3062C5.10313 12.2969 5.18437 12.3469 5.18437 12.4187ZM4.2125 12.2781C4.19063 12.3406 4.25313 12.4125 4.34688 12.4312C4.42813 12.4625 4.52188 12.4312 4.54063 12.3687C4.55938 12.3062 4.5 12.2344 4.40625 12.2063C4.325 12.1844 4.23438 12.2156 4.2125 12.2781ZM5.59375 12.225C5.50312 12.2469 5.44062 12.3063 5.45 12.3781C5.45937 12.4406 5.54063 12.4813 5.63438 12.4594C5.725 12.4375 5.7875 12.3781 5.77812 12.3156C5.76875 12.2563 5.68438 12.2156 5.59375 12.225ZM7.65 0.25C3.31563 0.25 0 3.54063 0 7.875C0 11.3406 2.18125 14.3063 5.29688 15.35C5.69688 15.4219 5.8375 15.175 5.8375 14.9719C5.8375 14.7781 5.82812 13.7094 5.82812 13.0531C5.82812 13.0531 3.64063 13.5219 3.18125 12.1219C3.18125 12.1219 2.825 11.2125 2.3125 10.9781C2.3125 10.9781 1.59687 10.4875 2.3625 10.4969C2.3625 10.4969 3.14062 10.5594 3.56875 11.3031C4.25312 12.5094 5.4 12.1625 5.84688 11.9563C5.91875 11.4563 6.12188 11.1094 6.34688 10.9031C4.6 10.7094 2.8375 10.4562 2.8375 7.45C2.8375 6.59062 3.075 6.15938 3.575 5.60938C3.49375 5.40625 3.22813 4.56875 3.65625 3.4875C4.30937 3.28437 5.8125 4.33125 5.8125 4.33125C6.4375 4.15625 7.10938 4.06563 7.775 4.06563C8.44063 4.06563 9.1125 4.15625 9.7375 4.33125C9.7375 4.33125 11.2406 3.28125 11.8938 3.4875C12.3219 4.57187 12.0563 5.40625 11.975 5.60938C12.475 6.1625 12.7812 6.59375 12.7812 7.45C12.7812 10.4656 10.9406 10.7062 9.19375 10.9031C9.48125 11.15 9.725 11.6187 9.725 12.3531C9.725 13.4062 9.71562 14.7094 9.71562 14.9656C9.71562 15.1687 9.85938 15.4156 10.2563 15.3438C13.3813 14.3062 15.5 11.3406 15.5 7.875C15.5 3.54063 11.9844 0.25 7.65 0.25ZM3.0375 11.0281C2.99687 11.0594 3.00625 11.1313 3.05938 11.1906C3.10938 11.2406 3.18125 11.2625 3.22187 11.2219C3.2625 11.1906 3.25313 11.1187 3.2 11.0594C3.15 11.0094 3.07812 10.9875 3.0375 11.0281ZM2.7 10.775C2.67813 10.8156 2.70937 10.8656 2.77187 10.8969C2.82187 10.9281 2.88438 10.9187 2.90625 10.875C2.92812 10.8344 2.89687 10.7844 2.83437 10.7531C2.77187 10.7344 2.72188 10.7437 2.7 10.775ZM3.7125 11.8875C3.6625 11.9281 3.68125 12.0219 3.75312 12.0813C3.825 12.1531 3.91562 12.1625 3.95625 12.1125C3.99687 12.0719 3.97813 11.9781 3.91563 11.9187C3.84688 11.8469 3.75313 11.8375 3.7125 11.8875ZM3.35625 11.4281C3.30625 11.4594 3.30625 11.5406 3.35625 11.6125C3.40625 11.6844 3.49063 11.7156 3.53125 11.6844C3.58125 11.6437 3.58125 11.5625 3.53125 11.4906C3.4875 11.4188 3.40625 11.3875 3.35625 11.4281Z" fill="white"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-dark-light flex items-center justify-center hover:bg-primary transition-colors">
                  <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 1H0.996875C0.446875 1 0 1.45313 0 2.00938V13.9906C0 14.5469 0.446875 15 0.996875 15H13C13.55 15 14 14.5469 14 13.9906V2.00938C14 1.45313 13.55 1 13 1ZM4.23125 13H2.15625V6.31875H4.23438V13H4.23125ZM3.19375 5.40625C2.52812 5.40625 1.99063 4.86563 1.99063 4.20312C1.99063 3.54062 2.52812 3 3.19375 3C3.85625 3 4.39687 3.54062 4.39687 4.20312C4.39687 4.86875 3.85937 5.40625 3.19375 5.40625ZM12.0094 13H9.93437V9.75C9.93437 8.975 9.91875 7.97813 8.85625 7.97813C7.775 7.97813 7.60938 8.82188 7.60938 9.69375V13H5.53438V6.31875H7.525V7.23125H7.55312C7.83125 6.70625 8.50938 6.15312 9.51875 6.15312C11.6188 6.15312 12.0094 7.5375 12.0094 9.3375V13Z" fill="white"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg text-primary mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Quick Links</h4>
              <ul className="space-y-3 text-base text-grey-light" style={{ fontFamily: 'var(--font-body)' }}>
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Shop All Products</Link></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Categories</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">About Us</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Technical Resources</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Shipping & Returns</span></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg text-primary mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Contact</h4>
              <ul className="space-y-3 text-base text-grey-light" style={{ fontFamily: 'var(--font-body)' }}>
                <li className="flex gap-3">
                  <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 flex-shrink-0">
                    <path d="M6.74062 15.6C8.34375 13.5938 12 8.73125 12 6C12 2.6875 9.3125 0 6 0C2.6875 0 0 2.6875 0 6C0 8.73125 3.65625 13.5938 5.25938 15.6C5.64375 16.0781 6.35625 16.0781 6.74062 15.6ZM6 4C6.53043 4 7.03914 4.21071 7.41421 4.58579C7.78929 4.96086 8 5.46957 8 6C8 6.53043 7.78929 7.03914 7.41421 7.41421C7.03914 7.78929 6.53043 8 6 8C5.46957 8 4.96086 7.78929 4.58579 7.41421C4.21071 7.03914 4 6.53043 4 6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4Z" fill="#E1AA23"/>
                  </svg>
                  <span className="leading-6">123 Tech Street<br/>Cambridge, CB1 2AB<br/>United Kingdom</span>
                </li>
                <li className="flex gap-3 items-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M1.5 2C0.671875 2 0 2.67188 0 3.5C0 3.97188 0.221875 4.41562 0.6 4.7L7.4 9.8C7.75625 10.0656 8.24375 10.0656 8.6 9.8L15.4 4.7C15.7781 4.41562 16 3.97188 16 3.5C16 2.67188 15.3281 2 14.5 2H1.5ZM0 5.5V12C0 13.1031 0.896875 14 2 14H14C15.1031 14 16 13.1031 16 12V5.5L9.2 10.6C8.4875 11.1344 7.5125 11.1344 6.8 10.6L0 5.5Z" fill="#E1AA23"/>
                  </svg>
                  <span>hello@siliconsoup.co.uk</span>
                </li>
                <li className="flex gap-3 items-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M5.15312 0.768722C4.9125 0.187472 4.27812 -0.121903 3.67188 0.0437222L0.921875 0.793722C0.378125 0.943722 0 1.43747 0 1.99997C0 9.73122 6.26875 16 14 16C14.5625 16 15.0563 15.6218 15.2063 15.0781L15.9563 12.3281C16.1219 11.7218 15.8125 11.0875 15.2312 10.8468L12.2312 9.59685C11.7219 9.38435 11.1313 9.53122 10.7844 9.95935L9.52188 11.5C7.32188 10.4593 5.54062 8.6781 4.5 6.4781L6.04063 5.21872C6.46875 4.86872 6.61562 4.28122 6.40312 3.77185L5.15312 0.771847V0.768722Z" fill="#E1AA23"/>
                  </svg>
                  <span>+44 1234 567890</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-dark-light pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-grey-light">
            <p style={{ fontFamily: 'var(--font-body)' }}>© 2024 SiliconSoup. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-white transition-colors cursor-pointer">Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
