import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

/**
 * Provider function to authorize API requests as seller role.
 * Verifies JWT, ensures 'type' is 'seller', then checks database for a valid seller account by ID.
 *
 * @param request headers for authentication
 * @returns SellerPayload if successful, throws ForbiddenException otherwise
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

  // Validate seller exists and is active, not deleted
  const seller = await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findFirst({
    where: {
      id: payload.id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}