import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

/**
 * Authenticate and authorize a seller based on JWT and database validation.
 *
 * - Verifies seller role via JWT token.
 * - Ensures seller is linked and active within the database (not deleted/terminated).
 * - Uses the top-level user table id as payload.id for validation.
 *
 * @param request Incoming HTTP request with Authorization header.
 * @returns Authenticated SellerPayload.
 * @throws ForbiddenException if authentication or seller validation fails.
 */
export async function sellerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not a seller`);
  }

  // Check ai_commerce_seller by buyer_id (payload.id = ai_commerce_buyer.id), not soft deleted
  const seller = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: payload.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
  });
  if (!seller) {
    throw new ForbiddenException("You're not enrolled as a seller or not active.");
  }

  // Extra: check buyer account is also not soft-deleted
  const buyer = await MyGlobal.prisma.ai_commerce_buyer.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: { not: "deleted" },
    },
  });
  if (!buyer) {
    throw new ForbiddenException("Your buyer account is not valid.");
  }

  return payload;
}
