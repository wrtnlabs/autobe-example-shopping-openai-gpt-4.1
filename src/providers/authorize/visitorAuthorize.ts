import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { VisitorPayload } from "../../decorators/payload/VisitorPayload";

/**
 * Authenticate and validate a visitor session using JWT and the ai_commerce_visitor table.
 *
 * @param request HTTP request object with headers
 * @returns VisitorPayload if valid visitor
 * @throws ForbiddenException if not a visitor or not enrolled/active
 */
export async function visitorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<VisitorPayload> {
  const payload: VisitorPayload = jwtAuthorize({ request }) as VisitorPayload;

  if (payload.type !== "visitor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // For visitor, payload.id holds ai_commerce_visitor.id (the top-level visitor identifier)
  const visitor = await MyGlobal.prisma.ai_commerce_visitor.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (visitor === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
