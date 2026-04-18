import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeDir'
const SITE_URL = 'https://vbcodingshow.com'

interface Props { name?: string; appTitle?: string; reason?: string; appId?: string }

const Email = ({ name = '创作者', appTitle = '你的作品', reason = '', appId = '' }: Props) => {
  const link = appId ? `${SITE_URL}/submit?id=${appId}` : `${SITE_URL}/profile`
  return (
    <Html lang="zh-CN" dir="ltr">
      <Head />
      <Preview>「{appTitle}」需要修改后重新提交</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar} />
          <Heading style={h1}>📝 作品需要调整</Heading>
          <Text style={text}>{name}，你好：</Text>
          <Text style={text}>
            非常感谢你提交 <strong style={{ color: '#0F172A' }}>「{appTitle}」</strong>。
            经过审核，作品暂时未能通过，但别灰心 —— 根据下方建议调整后即可重新提交。
          </Text>
          {reason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>📋 审核反馈</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          )}
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={link} style={button}>编辑并重新提交</Button>
          </Section>
          <Text style={text}>如有疑问，欢迎随时联系我们。期待你的精彩作品！</Text>
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} · Show Your Vibe Coding Apps</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `📝 「${d?.appTitle ?? '你的作品'}」需要调整后再提交`,
  displayName: '审核驳回（用户）',
  previewData: { name: '小明', appTitle: 'AI 翻译助手', reason: '描述过于简略，请补充作品功能与特色。', appId: 'demo-id' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const reasonBox = { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 16px', margin: '18px 0' }
const reasonLabel = { fontSize: '12px', color: '#B45309', fontWeight: 600, margin: '0 0 6px' }
const reasonText = { fontSize: '14px', color: '#78350F', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' as const }
const button = { background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
