import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdBundlesBundleId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
  body: IShoppingMallProductBundle.IUpdate;
}): Promise<IShoppingMallProductBundle> {
  const now = toISOStringSafe(new Date());
  // 1. Fetch bundle by id + product, ensure not deleted
  const bundle = await MyGlobal.prisma.shopping_mall_product_bundles.findUnique(
    {
      where: { id: props.bundleId },
    },
  );
  if (
    !bundle ||
    bundle.shopping_mall_product_id !== props.productId ||
    bundle.deleted_at !== null
  ) {
    throw new HttpException("Bundle not found", 404);
  }

  // 2. Fetch product, ensure not deleted or discontinued
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.status === "Discontinued") {
    throw new HttpException(
      "Cannot update bundle of a discontinued product",
      409,
    );
  }

  // 3. Check for duplicate bundle name if updating name to another value
  if (props.body.name !== undefined && props.body.name !== bundle.name) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_product_bundles.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          name: props.body.name,
          id: { not: props.bundleId },
          deleted_at: null,
        },
      });
    if (duplicate) {
      throw new HttpException(
        "Duplicate bundle name under the same product",
        409,
      );
    }
  }

  // 4. Patch update only provided fields, always set updated_at
  const updated = await MyGlobal.prisma.shopping_mall_product_bundles.update({
    where: { id: props.bundleId },
    data: {
      // PATCH semantics: Only fields present are included
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.bundle_type !== undefined && {
        bundle_type: props.body.bundle_type,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.position !== undefined && {
        position: props.body.position,
      }),
      updated_at: now,
    },
  });

  // 5. Return all required fields, convert date/datetime
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    name: updated.name,
    bundle_type: updated.bundle_type,
    description:
      updated.description !== undefined ? updated.description : undefined,
    position: updated.position,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
