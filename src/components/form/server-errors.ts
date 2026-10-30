import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { getErrorMessage, isApiError } from '@/api/errors'

/**
 * Maps an API failure onto the form: `fieldErrors` go to their fields (focusing the first),
 * anything else becomes the form-level `root.server` message.
 */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  fields: readonly Path<T>[],
) {
  if (isApiError(error)) {
    const entries = Object.entries(error.fieldErrors).filter(([field]) =>
      fields.includes(field as Path<T>),
    )
    entries.forEach(([field, messages], index) => {
      form.setError(
        field as Path<T>,
        { type: 'server', message: messages[0] },
        { shouldFocus: index === 0 },
      )
    })
    if (entries.length) return
  }
  form.setError('root.server', { type: 'server', message: getErrorMessage(error) })
}
