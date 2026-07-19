import type { LabelHTMLAttributes, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface RequiredMarkProps {
  className?: string
}

export function RequiredMark({ className = '' }: RequiredMarkProps) {
  return <span aria-hidden="true" className={`ml-1 font-semibold text-red-500 ${className}`.trim()}>*</span>
}

interface FormFieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode
  required?: boolean
  optional?: boolean
  admin?: boolean
}

export default function FormFieldLabel({
  children,
  required = false,
  optional = false,
  admin = false,
  className = '',
  ...props
}: FormFieldLabelProps) {
  const { t } = useTranslation(undefined, admin ? { lng: 'ko' } : undefined)

  return (
    <label className={`block text-sm font-medium text-neutral-700 ${className}`.trim()} {...props}>
      {children}
      {required && <RequiredMark />}
      {optional && <span className="ml-1 font-normal text-neutral-400">({t('common.optional')})</span>}
    </label>
  )
}

interface RequiredFieldsNoticeProps {
  admin?: boolean
  className?: string
}

export function RequiredFieldsNotice({ admin = false, className = '' }: RequiredFieldsNoticeProps) {
  const { t } = useTranslation(undefined, admin ? { lng: 'ko' } : undefined)

  return (
    <p className={`text-xs font-medium text-neutral-500 ${className}`.trim()}>
      <RequiredMark className="ml-0 mr-1" />
      {t('common.requiredFieldsHint')}
    </p>
  )
}
