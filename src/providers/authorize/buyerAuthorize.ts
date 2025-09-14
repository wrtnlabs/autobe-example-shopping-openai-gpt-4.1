import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { BuyerPayload } from "../../decorators/payload/BuyerPayload";

/**
 * Provider function for authenticating and authorizing buyers.
 * Verifies JWT and ensures user is a valid, active buyer.
 *
 * @param request - The incoming HTTP request, including headers.
 * @returns The authenticated buyer's payload.
 * @throws ForbiddenException if not a buyer or inactive/deleted.
 */
export async function buyerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<BuyerPayload> {
  const payload: BuyerPayload = jwtAuthorize({ request }) as BuyerPayload;

  if (payload.type !== "buyer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // ai_commerce_buyer is the top-level user table for buyers.
  const buyer = await MyGlobal.prisma.ai_commerce_buyer.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (buyer === null) {
    throw new ForbiddenException("You're not enrolled or your account is inactive/deleted.");
  }

  return payload;
}
