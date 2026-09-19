import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Returns the signed-in user from the JWT session, or null. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user; // { id, email, name, image, role }
}
