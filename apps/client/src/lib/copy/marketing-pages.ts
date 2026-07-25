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
    "Greetup helps you meet people through shared interests, profession, and location, then talk live through chat, voice, video, and spaces.",
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
        "Join spaces around shared topics and meet in group rooms",
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
        "Messages, calls, and space activity needed to deliver the service",
        "Basic device and usage data to keep the product secure and reliable",
      ],
    },
    {
      title: "How we use information",
      bullets: [
        "To match you with relevant people and spaces",
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

export type StoryBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "link"; label: string; href: string };

export const STORY_CONTENT = {
  eyebrow: "Our story",
  title: "Greetup - Meet people, not profiles",
  blocks: [
    {
      type: "paragraph",
      text: "A while ago, I was learning and playing around with real-time communication tech, and I was wondering what more I could build with this tech.",
    },
    {
      type: "paragraph",
      text: "The primary use case of WebRTC is real-time communication, and in social media, it's mostly used for apps like Omegle. But Omegle always felt spammy (you know what I'm talking about). After I researched why Omegle got banned, I found out it was mainly because of safety issues, abuse, and moderation problems.",
    },
    {
      type: "paragraph",
      text: "That made me think: can meeting strangers actually be safe, moderated, and if you got to connect with the right people you want in real time, would it be amazing?",
    },
    { type: "heading", text: "Social networks stopped being social" },
    {
      type: "paragraph",
      text: "We have apps for following people, watching reels, and scrolling forever.",
    },
    {
      type: "paragraph",
      text: "But actually meeting someone new and having a real conversation has somehow become really difficult which is kind of the whole point of a social network. Social media was supposed to help us socialize, and instead it got reduced to connections, follows, and feeds.",
    },
    {
      type: "paragraph",
      text: "Random chat apps already exist. But most are full of spam, people looking for just one thing (we know that), and conversations that die within a minute.",
    },
    {
      type: "paragraph",
      text: "I wanted something that felt more real getting connected with people, but with a good audience around.",
    },
    {
      type: "paragraph",
      text: "What if you were matched with someone who's looking for the same thing as you, at the same time? That's the idea behind GreetUp.",
    },
    {
      type: "paragraph",
      text: "I also have an interest in meeting different kinds of people and getting to know about their experiences, so GreetUp is built around that: connect with a good audience, NSFW protection, choose whom you want to meet, and do engaging activities together playing Chess, playing UNO, talking about your job, discussing a startup idea, or asking for advice.",
    },
    {
      type: "paragraph",
      text: "I think it's a good idea because a person like me would definitely use this app.",
    },
    { type: "heading", text: "Solving the icebreaker problem" },
    {
      type: "paragraph",
      text: "Then there's always the icebreaker problem, where people don't know how to get comfortable with each other. We solve this with AI conversation cues about the other person, and we only show the information they've chosen to share, with their consent.",
    },
    {
      type: "paragraph",
      text: "When you connect, we show small conversation cues as a toast\u200a-\u200ashared interests, profession, hobbies, or what they're looking for right now. Suppose you're interested in playing Chess or talking about philosophy we show that, and you immediately have something to talk about. That way, there's no awkward silence while breaking the ice.",
    },
    { type: "heading", text: "Activity-first, not gender-first" },
    {
      type: "paragraph",
      text: "Also, you know how in most live-streaming apps people mostly come to meet the opposite gender. We can't really change human intentions.",
    },
    {
      type: "paragraph",
      text: "So instead of fighting that behavior, why not redirect it?",
    },
    {
      type: "paragraph",
      text: "That's why the app is activity-first. We encourage people to do something together playing Chess, playing UNO, participating in polls, or giving opinions on different topics (handled at the application level; some of these are coming soon). These activities make conversations engaging and valuable, so people connect because they're doing something together, not just because they're looking for the opposite gender.",
    },
    { type: "heading", text: "The cold-start reality" },
    {
      type: "paragraph",
      text: "One honest caveat: the app is early, so right now there may be no one online. Everything works on a real-time basis, and if nobody is online you'll simply find no one that's the cold-start problem.",
    },
    {
      type: "paragraph",
      text: "If there's no one online, there's no one to connect with. But the matching engine is designed so that the more people there are, the better its filtering becomes a larger pool means it can find the best possible match based on your interests, activities, and preferences.",
    },
    {
      type: "paragraph",
      text: "If anyone is interested in building this app together, let me know. I'm open to connect. And if you find any bugs, errors, or technical issues, please reach out it'll be a huge favor.",
    },
    {
      type: "paragraph",
      text: "Also, if any investor or company is interested in building this app together, let me know. I'm always open to connecting, collaborating, and contributing however I can.",
    },
    { type: "link", label: "Try: https://greetup.co/", href: "https://greetup.co/" },
  ] satisfies StoryBlock[],
};

export const CONTACT_CONTENT = {
  eyebrow: "Contact",
  title: "Get in touch",
  description: "Email us directly, or use the form below.",
};
