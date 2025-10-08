import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellersSellerIdAddressesAddressId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerAddress> {
  const address =
    await MyGlobal.prisma.shopping_mall_seller_addresses.findFirst({
      where: {
        id: props.addressId,
        seller_id: props.sellerId,
        deleted_at: null,
      },
    });
  if (!address) {
    throw new HttpException("Address not found", 404);
  }
  return {
    id: address.id,
    seller_id: address.seller_id,
    type: typia.assert<"business" | "shipping" | "return">(address.type),
    recipient_name: address.recipient_name,
    phone: address.phone,
    region: address.region,
    postal_code: address.postal_code,
    address_line1: address.address_line1,
    address_line2: address.address_line2 ?? undefined,
    is_primary: address.is_primary,
    created_at: toISOStringSafe(address.created_at),
    updated_at: toISOStringSafe(address.updated_at),
    deleted_at: address.deleted_at
      ? toISOStringSafe(address.deleted_at)
      : undefined,
  };
}
