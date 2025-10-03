import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdVariantsVariantId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { productId, variantId } = props;
  // Find variant: must match both variantId and productId, and not be deleted
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: variantId,
        shopping_mall_product_id: productId,
        deleted_at: null,
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found or already deleted", 404);
  }
  // Soft delete
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: variantId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
