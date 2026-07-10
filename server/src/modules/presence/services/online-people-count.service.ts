import { listLiveOnlineUserIds } from "./live-online-users.service";

/** Other users currently online (excludes the signed-in viewer). */
export async function onlinePeopleCountForUser(viewerUserId: string): Promise<number> {
  const live = await listLiveOnlineUserIds();
  const count = live.includes(viewerUserId) ? live.length - 1 : live.length;
  return Math.max(0, count);
}
