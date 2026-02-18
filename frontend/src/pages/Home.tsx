import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { products, categories as categoriesApi } from '../api/client'
import type { Product, Category } from '../api/types'
import ProductCard from '../components/ProductCard'
import SectionHeading from '../components/SectionHeading'
import CategoryCard from '../components/CategoryCard'
import BenefitCard from '../components/BenefitCard'
import {
  ArrowRightLargeIcon,
  SignalBarsIcon,
  WifiIcon,
  CircuitIcon,
  AntennaIcon,
  ShippingIcon,
  HeadsetIcon,
  ShieldIcon,
} from '../components/icons'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'rfid-readers': <SignalBarsIcon />,
  'rfid-solutions': <SignalBarsIcon />,
  'nfc-rfid': <WifiIcon />,
  'nfc': <WifiIcon />,
  'rfid-tags': <WifiIcon />,
  'breakout-boards': <CircuitIcon />,
  'break-out-boards': <CircuitIcon />,
  'development-boards': <CircuitIcon />,
  'antennas': <AntennaIcon />,
  'accessories': <AntennaIcon />,
}

function categoryIcon(slug: string): React.ReactNode {
  return CATEGORY_ICONS[slug] ?? <CircuitIcon />
}

const BENEFITS = [
  {
    icon: <ShippingIcon />,
    title: 'Fast UK Shipping',
    description: 'Next-day delivery available on all orders. Track your shipment every step of the way.',
  },
  {
    icon: <HeadsetIcon />,
    title: 'Technical Support',
    description: 'Expert advice from engineers who understand your projects. Get help when you need it.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Quality Guaranteed',
    description: 'All components tested and verified. 30-day return policy on all products.',
  },
]

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
        const active = allProducts.filter((p) => p.status === 'active')
        const featuredItems = active.filter((p) => p.featured)
        setFeatured(featuredItems.length > 0 ? featuredItems.slice(0, 4) : active.slice(0, 4))
        setCats(allCats.slice(0, 4))
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
      {/* Hero Section */}
      <section className="bg-dark text-white overflow-hidden" style={{ height: '600px' }}>
        <div className="max-w-7xl mx-auto px-20 h-full flex items-center">
          <div className="max-w-3xl">
            <h1 className="text-6xl leading-tight mb-6" style={{
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.52px',
              lineHeight: '75px',
            }}>
              Quality Electronics Components for Your Next Project
            </h1>
            <p className="text-xl mb-8 leading-relaxed" style={{
              fontFamily: 'var(--font-body)',
              fontSize: '20px',
              lineHeight: '33px',
              letterSpacing: '-0.5px',
              color: '#D1D5DB',
            }}>
              Premium RFID solutions, NFC tags, and Raspberry Pi accessories for hobbyists, makers, and engineers. UK-based supplier with technical expertise you can trust.
            </p>
            <div className="flex gap-4">
              <Link
                to="/shop"
                className="bg-primary text-dark font-normal px-8 py-4 rounded hover:bg-primary-hover transition-colors"
                style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', letterSpacing: '-0.5px' }}
              >
                Shop Now
              </Link>
              <button
                className="border-2 border-primary text-primary font-normal px-8 py-4 rounded hover:bg-primary hover:text-dark transition-colors"
                style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', letterSpacing: '-0.5px' }}
              >
                Browse Categories
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-20">
          <SectionHeading
            title="Featured Products"
            subtitle="Handpicked components for your electronics projects"
          />

          {!loading && featured.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="text-center">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-normal transition-colors"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', letterSpacing: '-0.5px' }}
                >
                  View All Products
                  <ArrowRightLargeIcon />
                </Link>
              </div>
            </>
          ) : loading ? (
            <div className="text-center text-grey-text py-12">Loading...</div>
          ) : null}
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-20 bg-grey-bg">
        <div className="max-w-7xl mx-auto px-20">
          <SectionHeading
            title="Shop by Category"
            subtitle="Find exactly what you need for your project"
          />
          {loading ? (
            <div className="text-center text-grey-text py-12">Loading...</div>
          ) : cats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {cats.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  icon={categoryIcon(cat.slug)}
                  title={cat.name}
                  description={cat.description}
                  to={`/shop?category=${cat.slug}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-grey-text py-12">No categories found.</div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {BENEFITS.map((benefit) => (
              <BenefitCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
