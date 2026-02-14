interface SectionHeadingProps {
  title: string
  subtitle: string
}

export default function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-4xl text-dark mb-4" style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '36px',
        lineHeight: '40px',
        letterSpacing: '-0.5px',
      }}>
        {title}
      </h2>
      <p className="text-lg text-grey-text" style={{
        fontFamily: 'var(--font-body)',
        fontSize: '18px',
        lineHeight: '28px',
        letterSpacing: '-0.5px',
      }}>
        {subtitle}
      </p>
    </div>
  )
}
