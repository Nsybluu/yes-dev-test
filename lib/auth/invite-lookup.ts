import { hashInviteToken } from "@/lib/auth/invites";
import { prisma } from "@/lib/prisma";

// Looks the invitation up by the hash of the token in the link: it must still be
// pending and not expired. A plain server module (not a "use server" file) on
// purpose, so it is not exposed to browsers as a callable action.
export function findPendingInvite(token: string) {
  return prisma.admin.findFirst({
    where: {
      inviteTokenHash: hashInviteToken(token),
      status: "INVITED",
      inviteExpiresAt: { gt: new Date() },
    },
    select: { adminId: true, adminName: true, email: true },
  });
}
