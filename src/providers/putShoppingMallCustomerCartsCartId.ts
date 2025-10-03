import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  const { customer, cartId, body } = props;

  // 1. Fetch and check cart
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: cartId },
  });
  if (!cart || cart.deleted_at !== null) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own cart",
      403,
    );
  }

  // 2. Build update input, updating only allowed fields + updated_at, handle soft-delete
  const now = toISOStringSafe(new Date());
  const updateInput: Record<string, unknown> = {
    ...(body.shopping_mall_channel_id !== undefined && {
      shopping_mall_channel_id: body.shopping_mall_channel_id,
    }),
    ...(body.shopping_mall_section_id !== undefined && {
      shopping_mall_section_id: body.shopping_mall_section_id,
    }),
    ...(body.source !== undefined && { source: body.source }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.expires_at !== undefined && { expires_at: body.expires_at }),
    updated_at: now,
    ...(body.status === "deleted" && { deleted_at: now }),
  };

  const updated = await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: cartId },
    data: updateInput,
  });

  // 3. Return DTO with proper null/undefined logic for dates
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    shopping_mall_section_id: updated.shopping_mall_section_id,
    source: updated.source,
    status: updated.status,
    expires_at:
      updated.expires_at === null || updated.expires_at === undefined
        ? (updated.expires_at ?? undefined)
        : toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? (updated.deleted_at ?? undefined)
        : toISOStringSafe(updated.deleted_at),
  };
}
