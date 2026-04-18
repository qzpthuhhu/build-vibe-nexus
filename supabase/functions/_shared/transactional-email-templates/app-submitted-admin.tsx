import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeDir'
const SITE_URL = 'https://vbcodingshow.com'

interface Props {
  appTitle?: string
  appId?: string
  submitterName?: string
  submitterEmail?: string
  category?: string
  platform?: string
  reviewUrl?: string
}

const Email = ({
  appTitle = '未命名应用',
  appId = '',
  submitterName = '匿名用户',
  submitterEmail = '',
  category = '-',
  platform = '-',
  reviewUrl,
}: Props) => {
  const link = reviewUrl || `${SITE_URL}/admin?tab=review`
  return (
    <Html lang="zh-CN" dir="ltr">
      <Head />
      <Preview>新作品待审核：{appTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar} />
          <Heading style={h1}>📥 有新作品需要审核</Heading>
          <Text style={text}>有用户刚刚提交了新作品，请尽快审核。</Text>
          <Section style={card}>
            <Text style={label}>作品名称</Text>
            <Text style={value}>{appTitle}</Text>
            <Text style={label}>提交者</Text>
            <Text style={value}>{submitterName}{submitterEmail ? ` · ${submitterEmail}` : ''}</Text>
            <Text style={label}>分类 / 平台</Text>
            <Text style={value}>{category} · {platform}</Text>
            {appId && (<><Text style={label}>App ID</Text><Text style={valueMono}>{appId}</Text></>)}
          </Section>
          <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button href={link} style={button}>前往审核后台</Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} · 管理员通知</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `📥 新作品待审核：${d?.appTitle ?? '未命名应用'}`,
  displayName: '新作品待审核（管理员）',
  previewData: { appTitle: 'AI 翻译助手', submitterName: 'Alice', submitterEmail: 'alice@example.com', category: 'AI', platform: 'Web' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const card = { background: '#FAFAF9', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px 18px', margin: '16px 0' }
const label = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '8px 0 2px' }
const value = { fontSize: '14px', color: '#0F172A', margin: '0 0 4px', fontWeight: 500 }
const valueMono = { fontSize: '12px', color: '#475569', margin: '0 0 4px', fontFamily: 'ui-monospace, monospace' }
const button = { background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
