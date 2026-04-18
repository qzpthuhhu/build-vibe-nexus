import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeDir'
const SITE_URL = 'https://vbcodingshow.com'

interface AppItem { appTitle: string; appId: string; count: number }
interface Props { authorName?: string; totalFavs?: number; apps?: AppItem[] }

const Email = ({ authorName = '创作者', totalFavs = 0, apps = [] }: Props) => (
  <Html lang="zh-CN" dir="ltr">
    <Head />
    <Preview>今天你的作品被收藏了 {totalFavs} 次 ⭐</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>⭐ 今日收藏汇总</Heading>
        <Text style={text}>{authorName},</Text>
        <Text style={text}>
          今天有人觉得你的作品值得珍藏！共收到 <strong style={{ color: '#a855f7', fontSize: '18px' }}>{totalFavs}</strong> 次新收藏 ✨
        </Text>
        <Section style={listBox}>
          {apps.length === 0 ? (
            <Text style={emptyText}>(暂无明细)</Text>
          ) : (
            apps.map((app) => (
              <Section key={app.appId} style={row}>
                <Text style={rowTitle}>
                  <a href={`${SITE_URL}/app/${app.appId}`} style={link}>{app.appTitle}</a>
                </Text>
                <Text style={rowCount}>+{app.count} ⭐</Text>
              </Section>
            ))
          )}
        </Section>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={`${SITE_URL}/profile`} style={button}>查看我的作品</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · 你可以在「个人中心 → 邮件偏好」中关闭收藏汇总</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `⭐ 今天你的作品被收藏 ${d?.totalFavs ?? 0} 次`,
  displayName: '收藏日报',
  previewData: { authorName: '小明', totalFavs: 5, apps: [
    { appTitle: 'AI 翻译助手', appId: 'a1', count: 3 },
    { appTitle: '小红书排版工具', appId: 'a2', count: 2 },
  ] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const listBox = { background: '#FAFAF9', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '8px 16px', margin: '16px 0' }
const row = { display: 'flex' as const, justifyContent: 'space-between' as const, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }
const rowTitle = { fontSize: '14px', color: '#0F172A', margin: 0, fontWeight: 500 }
const rowCount = { fontSize: '14px', color: '#a855f7', margin: 0, fontWeight: 600 }
const link = { color: '#0F172A', textDecoration: 'none' }
const emptyText = { fontSize: '13px', color: '#94a3b8', margin: 0, textAlign: 'center' as const, padding: '12px 0' }
const button = { background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
