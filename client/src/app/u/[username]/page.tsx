import { PublicProfilePage } from "@/features/user-profile";
import { createPageMetadata } from "@/lib/routing/page-metadata";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return createPageMetadata(`@${decodeURIComponent(username)}`);
}

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  return <PublicProfilePage username={decodeURIComponent(username)} />;
}

