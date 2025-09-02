import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Provider function for authenticating and authorizing Admin users.
 *
 * @param request HTTP request object containing headers
 * @returns AdminPayload
 * @throws ForbiddenException if the user is not an admin or not active/enrolled
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

  // Validate the admin user in the DB and ensure active/valid
  const admin = await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
    where: {
      id: payload.id, // Admin is top-level entity (id is PK)
      is_active: true,
      deleted_at: null
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
