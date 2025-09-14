import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authentication provider for admin authorization.
 * @param request Express Request object
 * @returns AdminPayload if authenticated and valid
 * @throws ForbiddenException if token is invalid, type mismatched, or not valid admin
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

  // payload.id always holds the top-level admin user ID
  const admin = await MyGlobal.prisma.ai_commerce_admin.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or not an active admin");
  }

  return payload;
}
