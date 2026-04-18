import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeDir'
const SITE_URL = 'https://vbcodingshow.com'

interface Props {
  authorName?: string
  appTitle?: string
  appId?: string
  commenterName?: string
  commentContent?: string
}

const Email = ({
  authorName = '创作者',
  appTitle = '你的作品',
  appId = '',
  commenterName = '某位用户',
  commentContent = '',
}: Props) => {
  const link = appId ? `${SITE_URL}/app/${appId}` : SITE_URL
  return (
    <Html lang="zh-CN" dir="ltr">
      <Head />
      <Preview>{commenterName} 评论了你的作品</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar} />
          <Heading style={h1}>💬 你的作品收到了新评论</Heading>
          <Text style={text}>{authorName}，你好：</Text>
          <Text style={text}>
            <strong style={{ color: '#0F172A' }}>{commenterName}</strong> 评论了你的作品
            <strong style={{ color: '#0F172A' }}> 「{appTitle}」</strong>：
          </Text>
          <Section style={quote}>
            <Text style={quoteText}>{commentContent || '(无内容)'}</Text>
          </Section>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={link} style={button}>查看并回复</Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} · 你可以在「个人中心 → 邮件偏好」中关闭此类通知</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `💬 ${d?.commenterName ?? '有人'} 评论了「${d?.appTitle ?? '你的作品'}」`,
  displayName: '新评论通知',
  previewData: { authorName: '小明', appTitle: 'AI 翻译助手', commenterName: 'Alice', commentContent: '太赞了！界面很优雅，期待安卓版。' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const quote = { background: '#FAFAF9', borderLeft: '3px solid #a855f7', padding: '12px 16px', margin: '12px 0 18px', borderRadius: '0 8px 8px 0' }
const quoteText = { fontSize: '14px', color: '#0F172A', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, fontStyle: 'italic' as const }
const button = { background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
