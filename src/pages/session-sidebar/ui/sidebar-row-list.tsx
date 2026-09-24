import type { SidebarRowDensity } from '../../../shared/config'
import type { JSX } from 'solid-js'

export function SidebarRowList(props: { density: SidebarRowDensity; children: JSX.Element }) {
  return <box gap={props.density === 'comfortable' ? 1 : 0}>{props.children}</box>
}
