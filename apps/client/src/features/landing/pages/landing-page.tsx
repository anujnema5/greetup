import { LandingPageShell } from "../components/landing-page-shell";
import { LandingHeroServer } from "../server/landing-hero-server";
// import { LandingPageView } from "./landing-page-body";

export function LandingPage() {
  return (
    <LandingPageShell>
      <LandingHeroServer />
      {/* <LandingPageView /> */}
    </LandingPageShell>
  );
}
