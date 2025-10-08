import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

/**
 * Authorization provider for seller role.
 *
 * @param request HTTP request object containing headers
 * @returns SellerPayload if authenticated and authorized
 * @throws ForbiddenException if token is invalid or seller not found/active
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
  // JWT payload.id = shopping_mall_sellers.id (top-level user table)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      approval_status: "approved"
    },
  });
  if (seller === null) {
    throw new ForbiddenException("You're not enrolled or not an active seller");
  }
  return payload;
}
