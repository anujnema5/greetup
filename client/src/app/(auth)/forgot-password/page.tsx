import type { Metadata } from "next";

import ForgotPasswordPage from "@/features/auth/pages/forgot-password";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Forgot password",
  description: "Reset your Greetup account password.",
  path: "/forgot-password",
  noIndex: true,
});

const page = () => {
    return (
        <div>
            <ForgotPasswordPage />
        </div>
    )
}

export default page