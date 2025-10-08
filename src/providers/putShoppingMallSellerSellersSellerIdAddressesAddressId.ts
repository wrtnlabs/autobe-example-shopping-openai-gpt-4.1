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

export async function putShoppingMallSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerAddress.IUpdate;
}): Promise<IShoppingMallSellerAddress> {
  const { seller, sellerId, addressId, body } = props;
  // 1. Check address exists and is owned by seller
  const address =
    await MyGlobal.prisma.shopping_mall_seller_addresses.findUnique({
      where: { id: addressId },
    });
  if (!address) {
    throw new HttpException("Address not found", 404);
  }
  if (address.seller_id !== sellerId || seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: Cannot update address owned by another seller",
      403,
    );
  }
  // 2. If setting is_primary true, demote all other same-type addresses for this seller
  let transactionResult;
  const now = toISOStringSafe(new Date());
  if (body.is_primary === true) {
    // Must set all other addresses of this type or all types is_primary to false atomically
    transactionResult = await MyGlobal.prisma.$transaction([
      // Demote all other addresses of same seller/type
      MyGlobal.prisma.shopping_mall_seller_addresses.updateMany({
        where: {
          seller_id: sellerId,
          ...(body.type ? { type: body.type } : { type: address.type }),
          id: { not: addressId },
        },
        data: { is_primary: false },
      }),
      // Update this address
      MyGlobal.prisma.shopping_mall_seller_addresses.update({
        where: { id: addressId },
        data: {
          recipient_name: body.recipient_name ?? undefined,
          phone: body.phone ?? undefined,
          region: body.region ?? undefined,
          postal_code: body.postal_code ?? undefined,
          address_line1: body.address_line1 ?? undefined,
          address_line2: body.address_line2 ?? undefined,
          type: body.type ?? undefined,
          is_primary: true, // set explicitly
          updated_at: now,
        },
      }),
    ]);
    // The updated record is result[1]
    const updated = transactionResult[1];
    return {
      id: updated.id,
      seller_id: updated.seller_id,
      type: updated.type as "business" | "shipping" | "return",
      recipient_name: updated.recipient_name,
      phone: updated.phone,
      region: updated.region,
      postal_code: updated.postal_code,
      address_line1: updated.address_line1,
      address_line2: updated.address_line2 ?? undefined,
      is_primary: updated.is_primary,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  } else {
    // Simple update (possibly set is_primary false)
    const updated = await MyGlobal.prisma.shopping_mall_seller_addresses.update(
      {
        where: { id: addressId },
        data: {
          recipient_name: body.recipient_name ?? undefined,
          phone: body.phone ?? undefined,
          region: body.region ?? undefined,
          postal_code: body.postal_code ?? undefined,
          address_line1: body.address_line1 ?? undefined,
          address_line2: body.address_line2 ?? undefined,
          type: body.type ?? undefined,
          is_primary: body.is_primary ?? undefined,
          updated_at: now,
        },
      },
    );
    return {
      id: updated.id,
      seller_id: updated.seller_id,
      type: updated.type as "business" | "shipping" | "return",
      recipient_name: updated.recipient_name,
      phone: updated.phone,
      region: updated.region,
      postal_code: updated.postal_code,
      address_line1: updated.address_line1,
      address_line2: updated.address_line2 ?? undefined,
      is_primary: updated.is_primary,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  }
}
