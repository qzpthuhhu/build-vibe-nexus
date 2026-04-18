import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeDir'

interface Props { name?: string; appTitle?: string }

const Email = ({ name = '创作者', appTitle = '你的作品' }: Props) => (
  <Html lang="zh-CN" dir="ltr">
    <Head />
    <Preview>{appTitle} 已提交成功，等待审核</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>🎉 提交成功！</Heading>
        <Text style={text}>{name}，你好：</Text>
        <Text style={text}>
          我们已收到你提交的作品 <strong style={{ color: '#0F172A' }}>「{appTitle}」</strong>。
          管理员会尽快审核（通常在 24 小时内），结果将通过邮件通知你。
        </Text>
        <Section style={tipBox}>
          <Text style={tipText}>💡 在等待期间，你可以完善作品介绍、补充截图，让审核更顺利。</Text>
        </Section>
        <Text style={text}>感谢你为社区贡献优秀作品 ❤️</Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · Show Your Vibe Coding Apps</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `✅ 「${d?.appTitle ?? '你的作品'}」已提交成功`,
  displayName: '提交确认（用户）',
  previewData: { name: '小明', appTitle: 'AI 翻译助手' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const tipBox = { background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', border: '1px solid #f3e8ff', borderRadius: '10px', padding: '14px 16px', margin: '18px 0' }
const tipText = { fontSize: '13px', color: '#7e22ce', margin: 0, lineHeight: '1.5' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
