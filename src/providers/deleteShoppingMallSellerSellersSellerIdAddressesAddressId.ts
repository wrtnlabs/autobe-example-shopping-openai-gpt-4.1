import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the address and validate existence/ownership
  const address =
    await MyGlobal.prisma.shopping_mall_seller_addresses.findFirst({
      where: {
        id: props.addressId,
        seller_id: props.sellerId,
        deleted_at: null,
      },
    });
  if (!address) {
    throw new HttpException("Address not found or already deleted", 404);
  }
  if (address.seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Cannot delete another seller's address",
      403,
    );
  }
  if (address.is_primary) {
    throw new HttpException(
      "Cannot delete primary address. Please unset as primary before deletion.",
      409,
    );
  }
  // (Business: Validate not used in active orders/shipments)
  // No relations in schema, so this must be implemented when such FK exists
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_seller_addresses.update({
    where: { id: props.addressId },
    data: { deleted_at: deletedAt },
  });
}
