import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeDir'
const SITE_URL = 'https://vbcodingshow.com'

interface Props { name?: string }

const Email = ({ name = '创作者' }: Props) => (
  <Html lang="zh-CN" dir="ltr">
    <Head />
    <Preview>欢迎来到 {SITE_NAME} 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>👋 欢迎来到 {SITE_NAME}！</Heading>
        <Text style={text}>{name}，你好：</Text>
        <Text style={text}>
          欢迎加入 <strong style={{ color: '#0F172A' }}>{SITE_NAME}</strong> —— 全球 AI 独立开发者的作品发布平台。
          这里聚集了一群和你一样热爱用代码创造价值的 Vibe Coder ✨
        </Text>
        <Section style={tipBox}>
          <Text style={tipText}>🎁 注册礼：你已获得 <strong>100 积分</strong>。每次发布作品再奖 +20 积分！</Text>
        </Section>
        <Heading style={h2}>你可以做什么？</Heading>
        <Text style={item}>📤 提交你的 AI 应用，让全世界看到</Text>
        <Text style={item}>🔍 浏览社区精选，从他人作品中找灵感</Text>
        <Text style={item}>💬 评论、点赞、收藏，与创作者互动</Text>
        <Text style={item}>💰 标注作品出售，让好项目找到买家</Text>
        <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
          <Button href={`${SITE_URL}/submit`} style={button}>立即发布我的作品</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · Show Your Vibe Coding Apps</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: `👋 欢迎来到 ${SITE_NAME}`,
  displayName: '欢迎邮件',
  previewData: { name: '小明' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }
const h2 = { fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '20px 0 10px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const item = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 6px' }
const tipBox = { background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', border: '1px solid #f3e8ff', borderRadius: '10px', padding: '14px 16px', margin: '18px 0' }
const tipText = { fontSize: '13px', color: '#7e22ce', margin: 0, lineHeight: '1.5' }
const button = { background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
