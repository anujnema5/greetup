import type { Metadata } from "next";

import ProfileSetupStep from "@/features/profile-setup/pages/profile-setup-steps";
import { ProfileSetupProvider } from "@/features/profile-setup/provider";
import { buildPageMetadata } from "@/lib/site";

/** Auth-gated onboarding — must not static-prerender as RSC-only (breaks full page loads in prod). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Set up your profile",
  description: "Complete your Greetup profile to start matching and joining spaces.",
  path: "/profile-setup",
  noIndex: true,
});

const page = () => {
    return (
        <ProfileSetupProvider>
            <ProfileSetupStep />
        </ProfileSetupProvider>
    )
}

export default page