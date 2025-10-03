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

export async function putShoppingMallAdminCartsCartId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  // Step 1: Find the cart (must exist and not deleted)
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found or already deleted", 404);
  }

  // Step 2: Compute updated fields, handling status 'deleted'
  const now = toISOStringSafe(new Date());
  let setDeletedAt: (string & tags.Format<"date-time">) | null | undefined;
  if (props.body.status === "deleted") {
    setDeletedAt = now;
  } else {
    setDeletedAt = null;
  }

  // Step 3: Update, only allowed fields
  const updated = await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: {
      shopping_mall_channel_id:
        props.body.shopping_mall_channel_id ?? undefined,
      shopping_mall_section_id:
        props.body.shopping_mall_section_id ?? undefined,
      source: props.body.source ?? undefined,
      status: props.body.status ?? undefined,
      expires_at:
        props.body.expires_at !== undefined
          ? props.body.expires_at === null
            ? null
            : props.body.expires_at
          : undefined,
      deleted_at:
        props.body.status !== undefined
          ? props.body.status === "deleted"
            ? now
            : null
          : undefined,
      updated_at: now,
    },
  });

  // Step 4: Return per DTO (null/undefined handling)
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    shopping_mall_section_id: updated.shopping_mall_section_id,
    source: updated.source,
    status: updated.status,
    expires_at:
      updated.expires_at !== null && updated.expires_at !== undefined
        ? toISOStringSafe(updated.expires_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
