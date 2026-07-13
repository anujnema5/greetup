import { PublicProfilePage } from "@/features/user-profile";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  return <PublicProfilePage username={decodeURIComponent(username)} />;
}
