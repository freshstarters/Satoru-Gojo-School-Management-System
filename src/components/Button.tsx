import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'plain' | 'danger'
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  const variantClass =
    variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : variant === 'danger' ? 'btn-danger' : 'icon-plain'
  return <button type={type} className={`${variantClass} ${className}`.trim()} {...props} />
}
