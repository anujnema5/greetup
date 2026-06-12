import type { Metadata } from "next";

import Register from "@/features/auth/pages/register";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Create account",
  description: "Join Greetup to match with people by interest, profession, or location.",
  path: "/register",
});

const page = () => {
  return (
    <div className='min-h-screen flex flex-col justify-center items-center'>
      <Register />
    </div>
  )
}

export default page