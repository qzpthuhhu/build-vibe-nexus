/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: Props) => (
  <Html lang="zh-CN" dir="ltr">
    <Head />
    <Preview>你被邀请加入 {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>🎉 你被邀请加入</Heading>
        <Text style={text}>
          有人邀请你加入 <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link> —— 全球 AI 独立开发者的作品发布平台。点击下方按钮接受邀请并创建账户。
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={confirmationUrl}>接受邀请</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>如果你不期望收到此邀请，可以忽略此邮件。</Text>
      </Container>
    </Body>
  </Html>
)
export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const link = { color: '#a855f7', textDecoration: 'underline' }
const button = { background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600 as const, textDecoration: 'none', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
