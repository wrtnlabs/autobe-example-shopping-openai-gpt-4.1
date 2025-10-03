import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Provider function for authenticating admin role using JWT.
 * Verifies token, checks payload type, and validates active admin existence by admin id.
 * @param request Request object containing HTTP headers
 * @returns Authenticated AdminPayload
 * @throws ForbiddenException if not admin, not enrolled, or deleted
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

  // shopping_mall_admins is standalone (top-level)
  // payload.id is admin id (UUID)
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active", // Only active admins permitted
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
