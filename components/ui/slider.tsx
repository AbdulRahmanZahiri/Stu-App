'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  min?: number
  max?: number
  step?: number
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  className?: string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, defaultValue, onValueChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value?.[0]}
        defaultValue={defaultValue?.[0]}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        className={cn('w-full accent-violet-600 cursor-pointer', className)}
        {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
