"use client";

import { useState } from "react";
import { Mail, MessageSquare, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/lib/site";
import { toast } from "sonner";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject = encodeURIComponent(`Greetup contact: ${name || "New message"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    );
    window.location.href = `mailto:${siteConfig.contactEmail}?subject=${subject}&body=${body}`;
    toast.success("Opening your email app…");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="rounded-2xl border border-white/8 bg-[oklch(14%_0.012_110/0.72)] p-4 sm:p-5 transition-colors hover:border-[oklch(88%_0.11_105/0.25)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[oklch(88%_0.11_105/0.1)] border border-[oklch(88%_0.11_105/0.2)]">
              <Mail className="size-4 text-[oklch(88%_0.11_105)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">General</p>
              <p className="text-xs text-white/45">{siteConfig.contactEmail}</p>
            </div>
          </div>
        </a>
        <a
          href={`mailto:${siteConfig.supportEmail}`}
          className="rounded-2xl border border-white/8 bg-[oklch(14%_0.012_110/0.72)] p-4 sm:p-5 transition-colors hover:border-[oklch(88%_0.11_105/0.25)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[oklch(88%_0.11_105/0.1)] border border-[oklch(88%_0.11_105/0.2)]">
              <MessageSquare className="size-4 text-[oklch(88%_0.11_105)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Support</p>
              <p className="text-xs text-white/45">{siteConfig.supportEmail}</p>
            </div>
          </div>
        </a>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/8 bg-[oklch(14%_0.012_110/0.72)] p-5 sm:p-6 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-medium text-white/55">Name</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="pl-9 bg-[#111111] border-white/10 text-white placeholder:text-white/25"
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-white/55">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9 bg-[#111111] border-white/10 text-white placeholder:text-white/25"
              />
            </div>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-medium text-white/55">Message</span>
          <Textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind…"
            rows={5}
            className="min-h-[120px] resize-y bg-[#111111] border-white/10 text-white placeholder:text-white/25"
          />
        </label>

        <Button
          type="submit"
          className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] hover:brightness-105 font-semibold"
        >
          Send message <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
