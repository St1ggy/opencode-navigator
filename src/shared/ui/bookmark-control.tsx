import { IconControl } from './icon-control'
import { useIcons } from './icons'

import type { IconControlProps } from './icon-control'

export type BookmarkControlProps = Omit<IconControlProps, 'icon'> & {
  bookmarked: boolean
}

export function BookmarkControl(props: BookmarkControlProps) {
  const icons = useIcons()

  return (
    <IconControl
      ref={props.ref}
      id={props.id}
      icon={icons.icon(props.bookmarked ? 'bookmark' : 'bookmarkEmpty')}
      backgroundColor={props.backgroundColor}
      foregroundColor={props.foregroundColor}
      onMouseOver={props.onMouseOver}
      onMouseOut={props.onMouseOut}
      onMouseDown={props.onMouseDown}
      onMouseUp={props.onMouseUp}
    />
  )
}
