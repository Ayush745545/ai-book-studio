import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the signed-in user from the JWT session, or null.
 *
 * The JWT session alone is not trusted for the user id: it may carry a
 * stale id (e.g. after a database reset or migration). We always verify the
 * user still exists in the database before returning it, so callers that
 * create rows with `authorId: user.id` never hit a
 * `Book_authorId_fkey` foreign-key violation.
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}
