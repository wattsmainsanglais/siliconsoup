import type { OptionGroup, OptionValue } from '../api/types'
import { formatPrice } from '../utils/price'

interface Props {
  group: OptionGroup
  selected: OptionValue | null
  onChange: (value: OptionValue | null) => void
}

export default function OptionSelector({ group, selected, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (!val) {
      onChange(null)
      return
    }
    const option = group.values?.find((v) => v.id === val)
    onChange(option ?? null)
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-dark mb-1">
        {group.name}
        {group.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={selected?.id ?? ''}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      >
        {!group.required && <option value="">— Select —</option>}
        {group.values
          ?.slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((val) => (
            <option key={val.id} value={val.id}>
              {val.label}
              {val.price_modifier_pence !== 0 &&
                ` (${val.price_modifier_pence > 0 ? '+' : ''}${formatPrice(val.price_modifier_pence)})`}
            </option>
          ))}
      </select>
    </div>
  )
}
