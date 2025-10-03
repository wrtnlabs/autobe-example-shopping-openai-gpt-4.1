import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductContent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdContent(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductContent.IUpdate;
}): Promise<IShoppingMallProductContent> {
  const { admin, productId, body } = props;

  // Step 1: Fetch product. Ensure it exists and is not deleted/final.
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      status: true,
      business_status: true,
      deleted_at: true,
    },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product does not exist or was removed.", 404);
  }
  if (
    product.status === "Discontinued" ||
    product.status === "Deleted" ||
    product.status === "Blocked" ||
    product.business_status === "Discontinued" ||
    product.business_status === "Deleted" ||
    product.business_status === "Blocked"
  ) {
    throw new HttpException(
      "Cannot update content for finalized or immutable products.",
      409,
    );
  }

  // Step 2: Fetch content. Must exist.
  const content =
    await MyGlobal.prisma.shopping_mall_product_content.findUnique({
      where: {
        shopping_mall_product_id: productId,
      },
    });
  if (!content) {
    throw new HttpException("Product content does not exist.", 404);
  }

  // Step 3: Audit snapshot (capture pre-update state for compliance).
  // Get current max version for this product's snapshots
  const existingSnapshots =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: { shopping_mall_product_id: productId },
      orderBy: { snapshot_version: "desc" },
      take: 1,
      select: { snapshot_version: true },
    });
  const nextVersion =
    existingSnapshots.length > 0
      ? existingSnapshots[0].snapshot_version + 1
      : 1;
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: productId,
      snapshot_version: nextVersion,
      data_json: JSON.stringify({
        content_markdown: content.content_markdown,
        return_policy: content.return_policy,
        warranty_policy: content.warranty_policy,
        locale: content.locale,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Step 4: Update only the allowed fields.
  const updated = await MyGlobal.prisma.shopping_mall_product_content.update({
    where: { shopping_mall_product_id: productId },
    data: {
      content_markdown: body.content_markdown,
      return_policy: body.return_policy,
      warranty_policy: body.warranty_policy,
      locale: body.locale,
    },
  });

  // Step 5: Return result conforming to IShoppingMallProductContent.
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    content_markdown: updated.content_markdown,
    return_policy: updated.return_policy,
    warranty_policy: updated.warranty_policy,
    locale: updated.locale,
  };
}
