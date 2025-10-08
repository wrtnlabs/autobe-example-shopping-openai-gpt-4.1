import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authentication provider function for admin role.
 * Verifies JWT token, checks admin type, and authorizes against the database.
 *
 * @param request Express HTTP request object with headers
 * @returns AdminPayload if authenticated and enrolled
 * @throws ForbiddenException if not admin or not enrolled
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;
  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  // payload.id is the admin id (top-level user table for admin)
  // Validate admin exists and is not deleted or disabled
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });
  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }
  return payload;
}
