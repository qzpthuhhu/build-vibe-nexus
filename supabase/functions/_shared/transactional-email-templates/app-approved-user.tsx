import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeDir'
const SITE_URL = 'https://vbcodingshow.com'

interface Props { name?: string; appTitle?: string; appId?: string }

const Email = ({ name = '创作者', appTitle = '你的作品', appId = '' }: Props) => {
  const link = appId ? `${SITE_URL}/app/${appId}` : SITE_URL
  return (
    <Html lang="zh-CN" dir="ltr">
      <Head />
      <Preview>恭喜！「{appTitle}」已通过审核</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar} />
          <Heading style={h1}>🎊 审核通过！</Heading>
          <Text style={text}>{name}，恭喜你：</Text>
          <Text style={text}>
            你的作品 <strong style={{ color: '#0F172A' }}>「{appTitle}」</strong> 已通过审核，正式上线 {SITE_NAME}！
            现在所有访客都能发现并体验你的作品了 ✨
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={link} style={button}>查看我的作品</Button>
          </Section>
          <Section style={tipBox}>
            <Text style={tipText}>💎 你已获得 <strong>+20 积分</strong> 奖励！分享给朋友能获得更多曝光哦 ~</Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} · Show Your Vibe Coding Apps</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `🎊 「${d?.appTitle ?? '你的作品'}」已通过审核`,
  displayName: '审核通过（用户）',
  previewData: { name: '小明', appTitle: 'AI 翻译助手', appId: 'demo-id' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const tipBox = { background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', border: '1px solid #f3e8ff', borderRadius: '10px', padding: '14px 16px', margin: '18px 0' }
const tipText = { fontSize: '13px', color: '#7e22ce', margin: 0, lineHeight: '1.5' }
const button = { background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
