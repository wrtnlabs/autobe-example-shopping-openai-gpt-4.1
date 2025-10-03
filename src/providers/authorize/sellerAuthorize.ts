import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

/**
 * Provider function for authenticating sellers by JWT and database state.
 * Ensures the account is valid, active, and not logically deleted.
 *
 * @param request The HTTP request object containing headers (including JWT Authorization)
 * @returns Authenticated SellerPayload if validation passes
 * @throws ForbiddenException if not seller role, or DB state invalid
 */
export async function sellerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id = shopping_mall_customers.id (top-level user ID)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      shopping_mall_customer_id: payload.id,
      deleted_at: null,
      // Seller is only valid if customer is valid as well
      customer: {
        deleted_at: null,
        status: "active",
      },
      status: "active",
    },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled as an active seller");
  }

  return payload;
}
