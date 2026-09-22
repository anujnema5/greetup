import { PRODUCTION_ORIGIN } from "@/shared/constants/environments";

export const LANDING_SHARE = {
  url: PRODUCTION_ORIGIN,
  text: "When something big is happening — campus protests, exams, late-night debates — talk about it live with people who care. Try Greetup:",
} as const;

export function whatsappShareHref(text = LANDING_SHARE.text, url = LANDING_SHARE.url) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function xShareHref(text = LANDING_SHARE.text, url = LANDING_SHARE.url) {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
