import type { SkillInfo } from './controller'

export type SkillTarget = { key: string; routing: { directory?: string; workspace?: string } }
export type SkillSource = {
  list(target: SkillTarget): readonly SkillInfo[]
  refresh(target: SkillTarget, force: boolean, signal: AbortSignal): Promise<readonly SkillInfo[]>
  use(target: SkillTarget, skill: SkillInfo, signal: AbortSignal): Promise<boolean>
}
