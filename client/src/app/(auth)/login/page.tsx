import type { Metadata } from "next";

import Login from "@/features/auth/pages/login";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Log in",
  description: "Sign in to your Greetup account to match, chat, and join live circles.",
  path: "/login",
});

const page = () => {
  return (
    <Login />
  )
}

export default page