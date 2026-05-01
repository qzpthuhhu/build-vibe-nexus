import { Link } from 'react-router-dom';
import { MessageCircle, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import wechatQr from '@/assets/wechat-qr.jpg';

export default function CommunitySection() {
  return (
    <section className="relative border-t border-border/50 overflow-hidden">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06] blur-[100px]"
        style={{ background: 'linear-gradient(135deg, hsl(271 81% 56%), hsl(330 81% 60%))' }}
      />
      <div className="container relative py-16 md:py-20 text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold">
            🚀 加入 Vibe Coding 创作者社区
          </h2>
          <p className="mx-auto max-w-md text-sm md:text-base text-muted-foreground">
            这里聚集了一群在做 AI 产品、Vibe Coding、独立开发的朋友。
          </p>
        </div>

        <div className="flex items-center justify-center max-w-2xl mx-auto">
          {/* Email */}
          <div className="w-full max-w-sm rounded-xl border border-border/50 bg-card/60 p-5 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" style={{ color: 'hsl(271 81% 56%)' }} />
              <span className="text-sm font-semibold">📮 邮箱联系</span>
            </div>
            <div className="flex flex-col items-center justify-center py-6">
              <a
                href="mailto:richardandelu50@gmail.com"
                className="text-primary hover:underline text-sm font-medium"
              >
                richardandelu50@gmail.com
              </a>
            </div>
          </div>
        </div>

        <Link to="/contact">
          <Button variant="outline" size="sm" className="gap-1.5 mt-2">
            了解更多
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
