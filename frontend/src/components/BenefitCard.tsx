import type { ReactNode } from 'react'

interface BenefitCardProps {
  icon: ReactNode
  title: string
  description: string
}

export default function BenefitCard({ icon, title, description }: BenefitCardProps) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
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
      <p className="text-base text-grey-text" style={{
        fontFamily: 'var(--font-body)',
        fontSize: '16px',
        lineHeight: '24px',
        letterSpacing: '-0.5px',
      }}>
        {description}
      </p>
    </div>
  )
}
