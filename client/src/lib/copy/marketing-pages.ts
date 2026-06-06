import { siteConfig } from "@/lib/site";

export const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Community Guidelines", href: "/community-guidelines" },
  { label: "Contact", href: "/contact" },
] as const;

export type MarketingSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const ABOUT_CONTENT = {
  eyebrow: "About Greetup",
  title: "Real connection, built around what you care about",
  description:
    "Greetup helps you meet people through shared interests, profession, and location, then talk live through chat, voice, video, and circles.",
  sections: [
    {
      title: "Why we built Greetup",
      paragraphs: [
        "Most platforms optimize for attention. We optimize for alignment: finding people you actually want to talk to, not endless scrolling through profiles.",
        "Whether you want collaborators, friends, mentors, or a wider network, Greetup matches you in real time and gives you a comfortable space to connect.",
      ],
    },
    {
      title: "What you can do today",
      bullets: [
        "Match 1:1 by profession, interests, or open preferences",
        "Connect nearby or globally",
        "Chat, voice, and video when you match",
        "Join circles around shared topics and meet in group rooms",
      ],
    },
    {
      title: "Early beta",
      paragraphs: [
        "We're in early beta and shipping quickly. Some features are still rolling out, and your feedback directly shapes what we build next.",
        "Thank you for helping us build something real.",
      ],
    },
  ] satisfies MarketingSection[],
};

export const TERMS_CONTENT = {
  eyebrow: "Legal",
  title: "Terms & Conditions",
  description: "The rules for using Greetup. Last updated March 6, 2026.",
  sections: [
    {
      title: "1. Acceptance",
      paragraphs: [
        "By creating an account or using Greetup, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the service.",
      ],
    },
    {
      title: "2. Eligibility",
      paragraphs: [
        "You must be at least 18 years old to use Greetup. You are responsible for the accuracy of the information you provide and for keeping your account secure.",
      ],
    },
    {
      title: "3. Acceptable use",
      bullets: [
        "Be respectful. Harassment, hate speech, threats, and abuse are not allowed.",
        "Do not share illegal, exploitative, or NSFW content.",
        "Do not spam, scrape, reverse engineer, or attempt to disrupt the platform.",
        "Do not impersonate others or misrepresent your identity.",
      ],
    },
    {
      title: "4. Your content",
      paragraphs: [
        "You retain ownership of content you submit. You grant Greetup a limited license to host, display, and process that content solely to operate the service.",
        "We may remove content or suspend accounts that violate these Terms or our Community Guidelines.",
      ],
    },
    {
      title: "5. Beta service",
      paragraphs: [
        "Greetup is provided during early beta on an \"as is\" basis. Features may change, break, or be removed without notice while we iterate.",
      ],
    },
    {
      title: "6. Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by law, Greetup is not liable for indirect, incidental, or consequential damages arising from your use of the service.",
      ],
    },
    {
      title: "7. Contact",
      paragraphs: [
        `Questions about these Terms? Email us at ${siteConfig.contactEmail}.`,
      ],
    },
  ] satisfies MarketingSection[],
};

export const PRIVACY_CONTENT = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  description: "How Greetup handles your information. Last updated March 6, 2026.",
  sections: [
    {
      title: "Information we collect",
      bullets: [
        "Account details such as name, email, and profile information you choose to share",
        "Matching preferences, interests, and optional location signals you provide",
        "Messages, calls, and circle activity needed to deliver the service",
        "Basic device and usage data to keep the product secure and reliable",
      ],
    },
    {
      title: "How we use information",
      bullets: [
        "To match you with relevant people and circles",
        "To enable chat, voice, video, and live rooms",
        "To moderate the platform and enforce our guidelines",
        "To improve product performance and fix issues",
      ],
    },
    {
      title: "Sharing",
      paragraphs: [
        "We do not sell your personal information. We share data only with infrastructure providers required to run Greetup, when required by law, or to protect users and the platform.",
      ],
    },
    {
      title: "Your choices",
      bullets: [
        "Update profile and preference settings in the app",
        "Request account deletion by contacting support",
        "Control optional location sharing when the feature is enabled",
      ],
    },
    {
      title: "Contact",
      paragraphs: [`Privacy questions: ${siteConfig.contactEmail}`],
    },
  ] satisfies MarketingSection[],
};

export const COMMUNITY_GUIDELINES_CONTENT = {
  eyebrow: "Community",
  title: "Community Guidelines",
  description: "How we keep Greetup respectful, safe, and worth showing up for.",
  sections: [
    {
      title: "Be human",
      paragraphs: [
        "Treat people the way you'd want to be treated in a real conversation. Good-faith disagreement is fine; personal attacks are not.",
      ],
    },
    {
      title: "Keep it safe",
      bullets: [
        "No NSFW content, sexual exploitation, or graphic violence",
        "No harassment, bullying, hate speech, or targeted abuse",
        "No doxing or sharing private information without consent",
        "No scams, spam, or deceptive behavior",
      ],
    },
    {
      title: "Show up with intent",
      paragraphs: [
        "Greetup works best when people are open, honest, and present. Don't join rooms or matches just to disrupt them.",
      ],
    },
    {
      title: "Reporting & enforcement",
      paragraphs: [
        "We may warn, restrict, or remove accounts that break these guidelines. Repeated or severe violations can lead to permanent suspension.",
        `If something feels off, contact us at ${siteConfig.supportEmail}.`,
      ],
    },
  ] satisfies MarketingSection[],
};

export const CONTACT_CONTENT = {
  eyebrow: "Contact",
  title: "We'd love to hear from you",
  description:
    "Questions, feedback, partnership ideas, or help with your account. Reach out anytime.",
};
