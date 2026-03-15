export interface ResumeVersionRecord {
  year: number
  label: string
  summary: string
  path: string
  updatedAt: string
}

export const resumeVersions: ResumeVersionRecord[] = [
  {
    year: 2024,
    label: '基础搭建期',
    summary: '以课程、练习和首批完整项目为主，开始把“会写代码”转成“会完成交付”。',
    path: '/resume/2024',
    updatedAt: '2024-12-18'
  },
  {
    year: 2025,
    label: '工程深化期',
    summary: '开始更系统地关注项目结构、调试过程、性能问题和长期维护成本。',
    path: '/resume/2025',
    updatedAt: '2025-12-22'
  },
  {
    year: 2026,
    label: '写作与系统化期',
    summary: '把工程实践、写作输出和系统理解整合起来，形成更清晰的个人方向。',
    path: '/resume/2026',
    updatedAt: '2026-03-09'
  }
]

export const latestResumeVersion = resumeVersions.find((version) => version.year === 2025) ?? resumeVersions[resumeVersions.length - 1]
