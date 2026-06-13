"use client";

import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const fieldClass =
  "rounded-lg bg-[#111111] border-white/10 text-white placeholder:text-white/30 focus-visible:border-white/20 focus-visible:ring-white/10";

const contactCardClass =
  "block rounded-2xl border border-white/8 bg-[oklch(14%_0.012_110/0.72)] p-4 sm:p-5 cursor-pointer transition-colors hover:border-[oklch(88%_0.11_105/0.25)] hover:bg-[oklch(15%_0.012_110/0.82)]";

type ContactEmailCardProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  email: string;
};

function ContactEmailCard({ href, icon, title, email }: ContactEmailCardProps) {
  return (
    <a
      href={href}
      className={contactCardClass}
      aria-label={`Email ${title.toLowerCase()} at ${email}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[oklch(88%_0.11_105/0.1)] border border-[oklch(88%_0.11_105/0.2)]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-white/45">{email}</p>
        </div>
      </div>
    </a>
  );
}

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject = encodeURIComponent(`Greetup contact: ${name || "New message"}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${siteConfig.contactEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactEmailCard
          href={`mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent("Greetup inquiry")}`}
          icon={<Mail className="size-4 text-[oklch(88%_0.11_105)]" />}
          title="General"
          email={siteConfig.contactEmail}
        />
        <ContactEmailCard
          href={`mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent("Greetup support")}`}
          icon={<MessageSquare className="size-4 text-[oklch(88%_0.11_105)]" />}
          title="Support"
          email={siteConfig.supportEmail}
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/8 bg-[oklch(14%_0.012_110/0.72)] p-5 sm:p-6 space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="mb-2.5 block text-sm text-white/55">
              Name
            </label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={cn(fieldClass, "h-10")}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-2.5 block text-sm text-white/55">
              Email
            </label>
            <Input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={cn(fieldClass, "h-10")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-2.5 block text-sm text-white/55">
            Message
          </label>
          <Textarea
            id="contact-message"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's up?"
            rows={5}
            className={cn(fieldClass, "h-[120px] resize-none field-sizing-fixed overflow-y-auto")}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button
            type="submit"
            className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] hover:brightness-105 font-semibold"
          >
            Send message
          </Button>
          <p className="text-xs text-white/30">Opens your email app.</p>
        </div>
      </form>
    </div>
  );
}
