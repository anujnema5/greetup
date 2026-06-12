import type { Metadata } from "next";

import ResetPasswordPage from "@/features/auth/pages/reset-password";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Reset password",
  description: "Choose a new password for your Greetup account.",
  path: "/reset-password",
  noIndex: true,
});

const page = () => {
    return (
        <div>
            <ResetPasswordPage />
        </div>
    )
}

export default page