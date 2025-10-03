import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdBundlesBundleId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
  body: IShoppingMallProductBundle.IUpdate;
}): Promise<IShoppingMallProductBundle> {
  // 1. Ownership & product validation
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
      status: { not: "Discontinued" },
    },
  });
  if (!product) {
    throw new HttpException(
      "Product not found, not yours, deleted or discontinued",
      404,
    );
  }
  // 2. Bundle existence validation
  const bundle = await MyGlobal.prisma.shopping_mall_product_bundles.findFirst({
    where: {
      id: props.bundleId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!bundle) {
    throw new HttpException("Bundle not found or is deleted", 404);
  }
  // 3. Name uniqueness check if name is supplied and changed
  if (props.body.name && props.body.name !== bundle.name) {
    const nameExists =
      await MyGlobal.prisma.shopping_mall_product_bundles.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          name: props.body.name,
          deleted_at: null,
          id: { not: props.bundleId },
        },
      });
    if (nameExists) {
      throw new HttpException(
        "Bundle name must be unique within the product",
        409,
      );
    }
  }
  // 4. Update
  const updated = await MyGlobal.prisma.shopping_mall_product_bundles.update({
    where: { id: props.bundleId },
    data: {
      name: props.body.name ?? undefined,
      bundle_type: props.body.bundle_type ?? undefined,
      description:
        props.body.description !== undefined
          ? props.body.description
          : undefined,
      position: props.body.position ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Return shape
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    name: updated.name,
    bundle_type: updated.bundle_type,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description,
    position: updated.position,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : null,
  };
}
