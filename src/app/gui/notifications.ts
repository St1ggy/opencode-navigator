import type { Notifications } from '../../shared/lib/lifecycle'
import type { Context } from '@opencode/plugin/gui'

export function createGuiNotifications(context: Context): Notifications {
  return {
    show(input) {
      context.toast.show({
        title: input.title,
        description: input.message,
        variant: input.variant === 'info' || input.variant === 'warning' ? 'default' : input.variant,
      })
    },
  }
}
