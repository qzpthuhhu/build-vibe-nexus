import { Mail, MessageCircle, Sparkles, Users, Lightbulb, Rocket, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import wechatQr from '@/assets/wechat-qr.jpg';
import { Card, CardContent } from '@/components/ui/card';

const BENEFITS = [
  { icon: Lightbulb, key: 'inspiration' },
  { icon: Rocket, key: 'share' },
  { icon: Users, key: 'connect' },
  { icon: Gift, key: 'beta' },
];

export default function Contact() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: 'linear-gradient(135deg, hsl(271 81% 56%), hsl(330 81% 60%), hsl(142 72% 46%))' }}
        />
        <div className="container relative py-20 md:py-28 text-center space-y-5">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight animate-fade-up">
            🚀 和 AI 创作者连接起来
          </h1>
          <p className="mx-auto max-w-lg text-base md:text-lg text-muted-foreground animate-fade-up stagger-1">
            我们正在构建一个 AI + Vibe Coding 的创作者社区，欢迎开发者、产品人以及所有对 AI 感兴趣的人加入。
          </p>
        </div>
      </section>

      <div className="container py-12 md:py-16 space-y-16">
        {/* Contact Methods */}
        <section className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* WeChat */}
          <Card className="glass-card hover-lift">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">💬 微信交流</h2>
              </div>
              {/* QR Placeholder */}
              <img src={wechatQr} alt="微信二维码" className="max-w-[200px] mx-auto rounded-xl border border-border/50" />
              <div className="text-sm text-muted-foreground space-y-1 text-center">
                <p>扫码添加微信（备注：<span className="text-primary font-medium">vbcoding</span>）</p>
                <p>我会邀请你进入 AI 创作者交流群</p>
              </div>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="glass-card hover-lift">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'hsl(271 81% 56% / 0.1)' }}>
                  <Mail className="h-5 w-5" style={{ color: 'hsl(271 81% 56%)' }} />
                </div>
                <h2 className="text-lg font-semibold">📮 邮箱联系</h2>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <a
                  href="mailto:richardandelu50@gmail.com"
                  className="text-primary hover:underline font-medium text-base"
                >
                  richardandelu50@gmail.com
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  有合作想法或问题？直接发邮件给我
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Why Join */}
        <section className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold">🎁 为什么加入？</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map(({ icon: Icon, key }) => {
              const labels: Record<string, string> = {
                inspiration: '获取最新 AI 工具和项目灵感',
                share: '分享你的 Vibe Coding 作品',
                connect: '认识更多开发者和创作者',
                beta: '获得早期产品内测机会',
              };
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-4 text-left hover-lift"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground/90">{labels[key]}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
