import type { Metadata } from "next";

import VerifyEmailPage from "@/features/auth/pages/verify-email";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Verify email",
  description: "Confirm your email address to finish setting up your Greetup account.",
  path: "/verify-email",
  noIndex: true,
});

const page = () => {
    return (
        <div>
            <VerifyEmailPage />
        </div>
    )
}

export default page