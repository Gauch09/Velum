'use client'

import { useState, type ReactNode } from 'react'

type Props = {
  skin: ReactNode
  rail: ReactNode
  clad: ReactNode
  skinRail: ReactNode
}

const TABS = [
  { key: 'skin',    label: 'Skin'      },
  { key: 'rail',    label: 'Rail'      },
  { key: 'clad',    label: 'Clad'      },
  { key: 'skinRail', label: 'Skin.Rail' },
] as const

type TabKey = typeof TABS[number]['key']

export default function SistemasTabs({ skin, rail, clad, skinRail }: Props) {
  const [active, setActive] = useState<TabKey>('skin')

  const content: Record<TabKey, ReactNode> = { skin, rail, clad, skinRail }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t transition-colors',
              active === t.key
                ? 'bg-gray-800 text-white border border-b-gray-800 border-gray-700 -mb-px'
                : 'text-gray-500 hover:text-gray-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {content[active]}
    </div>
  )
}
