import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdBundlesBundleId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 1: Fetch bundle to check existence, matching product, and not deleted
  const bundle = await MyGlobal.prisma.shopping_mall_product_bundles.findUnique(
    {
      where: { id: props.bundleId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
      },
    },
  );

  if (!bundle) {
    throw new HttpException("Bundle not found", 404);
  }
  if (bundle.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Bundle does not belong to the specified product",
      400,
    );
  }
  if (bundle.deleted_at !== null) {
    throw new HttpException("Bundle already deleted", 400);
  }

  // Soft-delete: mark deleted_at
  await MyGlobal.prisma.shopping_mall_product_bundles.update({
    where: { id: props.bundleId },
    data: { deleted_at: now },
  });
}
