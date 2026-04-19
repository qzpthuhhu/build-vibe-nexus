/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props { token: string }

export const ReauthenticationEmail = ({ token }: Props) => (
  <Html lang="zh-CN" dir="ltr">
    <Head />
    <Preview>你的身份验证码</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>🔢 身份验证</Heading>
        <Text style={text}>请使用下方验证码确认你的身份：</Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>验证码将在短时间内失效。如果不是你发起的，请忽略此邮件。</Text>
      </Container>
    </Body>
  </Html>
)
export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', margin: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brandBar = { height: '4px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', borderRadius: '4px', margin: '24px 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const codeBox = { background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', border: '1px solid #f3e8ff', borderRadius: '10px', padding: '18px', margin: '20px 0', textAlign: 'center' as const }
const codeStyle = { fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: '28px', fontWeight: 700 as const, color: '#a855f7', letterSpacing: '4px', margin: 0 }
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
