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

export async function getShoppingMallAdminOrderAddressesOrderAddressId(props: {
  admin: AdminPayload;
  orderAddressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderAddress> {
  const found = await MyGlobal.prisma.shopping_mall_order_addresses.findUnique({
    where: { id: props.orderAddressId },
  });
  if (!found) {
    throw new HttpException("Order address not found", 404);
  }
  return {
    id: found.id,
    address_type: found.address_type,
    recipient_name: found.recipient_name,
    phone: found.phone,
    zip_code: found.zip_code,
    address_main: found.address_main,
    address_detail: found.address_detail ?? undefined,
    country_code: found.country_code,
    created_at: toISOStringSafe(found.created_at),
  };
}
