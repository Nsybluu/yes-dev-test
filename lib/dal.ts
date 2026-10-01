import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Data access layer: the authoritative auth check. Proxy only does an
// optimistic redirect, so every admin page and server action must call one
// of these rather than trusting that the route was already protected.

export const getCurrentAdmin = cache(async () => {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const admin = await prisma.admin.findUnique({
    where: { adminId: session.adminId },
    select: { adminId: true, adminName: true, email: true, adminRole: true, status: true },
  });
  // invited-but-not-activated accounts must not hold a working session
  if (!admin || admin.status !== "ACTIVE") return null;
  return admin;
});

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}

export async function requireSuperAdmin() {
  const admin = await requireAdmin();
  if (admin.adminRole !== "SUPER_ADMIN") redirect("/admin");
  return admin;
}
