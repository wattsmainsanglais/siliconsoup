import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'
import type { ReactNode } from 'react'

interface CategoryCardProps {
  icon: ReactNode
  title: string
  description: string
  to: string
}

export default function CategoryCard({ icon, title, description, to }: CategoryCardProps) {
  return (
    <div className="bg-white rounded-lg p-8 hover:shadow-lg transition-shadow">
      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-8">
        {icon}
      </div>
      <h3 className="text-xl text-dark mb-3" style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '20px',
        lineHeight: '28px',
        letterSpacing: '-0.5px',
      }}>
        {title}
      </h3>
      <p className="text-base text-grey-text mb-6" style={{
        fontFamily: 'var(--font-body)',
        fontSize: '16px',
        lineHeight: '24px',
        letterSpacing: '-0.5px',
      }}>
        {description}
      </p>
      <Link
        to={to}
        className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium transition-colors"
        style={{ fontSize: '16px' }}
      >
        Explore
        <ArrowRightIcon />
      </Link>
    </div>
  )
}
