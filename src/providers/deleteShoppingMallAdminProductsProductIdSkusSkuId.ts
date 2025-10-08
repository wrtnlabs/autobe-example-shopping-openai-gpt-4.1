import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdSkusSkuId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch SKU and verify
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      deleted_at: true,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }
  if (sku.deleted_at !== null) {
    throw new HttpException("SKU has already been deleted.", 400);
  }
  if (sku.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "SKU does not belong to the specified product.",
      400,
    );
  }

  // 2. Block delete if order_items reference this SKU and not deleted (status in [none, pending, processing, shipped, delivered])
  const hasActiveOrder =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_sku_id: props.skuId,
        deleted_at: null,
        refund_status: {
          in: ["none", "pending", "processing", "shipped", "delivered"],
        },
      },
      select: { id: true },
    });
  if (hasActiveOrder) {
    throw new HttpException(
      "Cannot delete SKU: It is referenced by an active or pending order.",
      409,
    );
  }

  // 3. Soft delete (update deleted_at and updated_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: props.skuId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // 4. Audit log (admin action)
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      affected_product_id: props.productId,
      action_type: "soft_delete_sku",
      action_reason: `Soft deleted SKU ${props.skuId}`,
      domain: "product_sku",
      created_at: now,
    },
  });
}
