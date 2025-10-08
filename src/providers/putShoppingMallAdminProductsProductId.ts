import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // 1. Fetch product, ensure it exists and not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }

  // 2. If updating category, fetch category and validate active, leaf
  if (
    props.body.shopping_mall_category_id !== undefined &&
    props.body.shopping_mall_category_id !== null
  ) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.shopping_mall_category_id },
    });
    if (!category || category.deleted_at !== null || !category.is_active) {
      throw new HttpException("Category not found or inactive", 400);
    }
    const hasChildren = await MyGlobal.prisma.shopping_mall_categories.count({
      where: { parent_id: category.id, deleted_at: null },
    });
    if (hasChildren > 0) {
      throw new HttpException(
        "Category is not a leaf and cannot be assigned",
        400,
      );
    }
  }

  // 3. If updating name, check uniqueness within seller scope (ignore self)
  if (
    props.body.name !== undefined &&
    props.body.name !== product.name &&
    props.body.name.length > 0
  ) {
    const exists = await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        shopping_mall_seller_id: product.shopping_mall_seller_id,
        name: props.body.name,
        id: { not: product.id },
        deleted_at: null,
      },
    });
    if (exists) {
      throw new HttpException("Duplicate product name for seller", 409);
    }
  }

  // 4. Update product fields
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: product.id },
    data: {
      shopping_mall_category_id:
        props.body.shopping_mall_category_id ?? undefined,
      name: props.body.name ?? undefined,
      description: props.body.description ?? undefined,
      is_active: props.body.is_active ?? undefined,
      main_image_url:
        props.body.main_image_url === undefined
          ? undefined
          : props.body.main_image_url,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    is_active: updated.is_active,
    main_image_url:
      updated.main_image_url === null ? undefined : updated.main_image_url,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
