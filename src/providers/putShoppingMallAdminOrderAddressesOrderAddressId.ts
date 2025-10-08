import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrderAddressesOrderAddressId(props: {
  admin: AdminPayload;
  orderAddressId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderAddress.IUpdate;
}): Promise<IShoppingMallOrderAddress> {
  // 1. Existence check only -- no deleted_at in schema
  const exist = await MyGlobal.prisma.shopping_mall_order_addresses.findUnique({
    where: { id: props.orderAddressId },
  });
  if (!exist) {
    throw new HttpException("Order address not found", 404);
  }

  // 2. Update mutable fields only (per schema; no deleted_at handling)
  const updated = await MyGlobal.prisma.shopping_mall_order_addresses.update({
    where: { id: props.orderAddressId },
    data: {
      address_type: props.body.address_type ?? undefined,
      recipient_name: props.body.recipient_name ?? undefined,
      phone: props.body.phone ?? undefined,
      zip_code: props.body.zip_code ?? undefined,
      address_main: props.body.address_main ?? undefined,
      address_detail: props.body.address_detail ?? undefined,
      country_code: props.body.country_code ?? undefined,
    },
  });

  // 3. Shape response to match IShoppingMallOrderAddress exactly.
  return {
    id: updated.id,
    address_type: updated.address_type,
    recipient_name: updated.recipient_name,
    phone: updated.phone,
    zip_code: updated.zip_code,
    address_main: updated.address_main,
    address_detail: updated.address_detail ?? undefined,
    country_code: updated.country_code,
    created_at: toISOStringSafe(updated.created_at),
  };
}
