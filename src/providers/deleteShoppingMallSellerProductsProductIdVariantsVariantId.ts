import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Lookup the variant and its product. Must match all IDs and not be deleted. Join with product to check seller ownership.
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
        product: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
      include: {
        product: true,
      },
    });

  if (!variant) {
    throw new HttpException("Product variant not found or access denied", 404);
  }

  // Step 2: Soft-delete by setting deleted_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: {
      id: props.variantId,
    },
    data: {
      deleted_at: now,
    },
  });
  // No return
}
