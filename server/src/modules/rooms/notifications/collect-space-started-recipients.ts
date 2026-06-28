export function collectSpaceStartedRecipientUserIds(
  hostUserId: string,
  inviteeUserIds: string[],
  participantUserIds: string[],
): string[] {
  const recipients = new Set<string>();
  for (const userId of [...inviteeUserIds, ...participantUserIds]) {
    if (!userId || userId === hostUserId) continue;
    recipients.add(userId);
  }
  return [...recipients];
}
