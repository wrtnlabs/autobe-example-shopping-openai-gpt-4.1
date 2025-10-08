import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerAddress> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden: You may only access your own addresses",
      403,
    );
  }
  const record = await MyGlobal.prisma.shopping_mall_seller_addresses.findFirst(
    {
      where: {
        id: props.addressId,
        seller_id: props.sellerId,
        deleted_at: null,
      },
    },
  );
  if (!record) {
    throw new HttpException("Address not found", 404);
  }
  return {
    id: record.id,
    seller_id: record.seller_id,
    type: typia.assert<"business" | "shipping" | "return">(record.type),
    recipient_name: record.recipient_name,
    phone: record.phone,
    region: record.region,
    postal_code: record.postal_code,
    address_line1: record.address_line1,
    address_line2:
      record.address_line2 === null ? undefined : record.address_line2,
    is_primary: record.is_primary,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
