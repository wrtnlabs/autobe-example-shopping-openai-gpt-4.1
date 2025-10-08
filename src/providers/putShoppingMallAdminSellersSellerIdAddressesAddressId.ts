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

export async function putShoppingMallAdminSellersSellerIdAddressesAddressId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerAddress.IUpdate;
}): Promise<IShoppingMallSellerAddress> {
  const { sellerId, addressId, body } = props;

  // 1. Find address
  const address =
    await MyGlobal.prisma.shopping_mall_seller_addresses.findFirst({
      where: {
        id: addressId,
        seller_id: sellerId,
        deleted_at: null,
      },
    });
  if (!address) throw new HttpException("Address not found.", 404);

  // 2. Transaction for primary logic
  const now = toISOStringSafe(new Date());
  let updated;
  if (body.is_primary === true && address.is_primary === false) {
    // If promoting this to primary, demote all others of same seller/type atomically
    await MyGlobal.prisma.$transaction([
      // Demote others of same type to non-primary
      MyGlobal.prisma.shopping_mall_seller_addresses.updateMany({
        where: {
          seller_id: sellerId,
          type: body.type ?? address.type,
          is_primary: true,
          deleted_at: null,
          NOT: { id: addressId },
        },
        data: { is_primary: false, updated_at: now },
      }),
    ]);
    // Update this address record
    updated = await MyGlobal.prisma.shopping_mall_seller_addresses.update({
      where: { id: addressId },
      data: {
        recipient_name: body.recipient_name ?? undefined,
        phone: body.phone ?? undefined,
        region: body.region ?? undefined,
        postal_code: body.postal_code ?? undefined,
        address_line1: body.address_line1 ?? undefined,
        address_line2: body.address_line2 ?? undefined,
        type: body.type ?? undefined,
        is_primary: true,
        updated_at: now,
      },
    });
  } else {
    // Non-primary update or not promoting
    updated = await MyGlobal.prisma.shopping_mall_seller_addresses.update({
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
    });
  }

  return {
    id: updated.id,
    seller_id: updated.seller_id,
    type: typia.assert<"business" | "shipping" | "return">(updated.type),
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
