import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCartsCartId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find cart by id, ensure not already deleted
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or already deleted", 404);
  }

  // Soft delete: set deleted_at to now
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
