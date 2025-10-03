import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCartsCartId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCart> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Shopping cart not found", 404);
  }
  return {
    id: cart.id,
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    source: cart.source,
    status: cart.status,
    expires_at: cart.expires_at ? toISOStringSafe(cart.expires_at) : undefined,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at: undefined,
  };
}
