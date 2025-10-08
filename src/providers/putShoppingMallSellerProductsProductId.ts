import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const { seller, productId, body } = props;
  // 1. Fetch product & ownership verification
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // 2. If updating name, check name uniqueness (case-insensitive within seller)
  if (body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        shopping_mall_seller_id: seller.id,
        id: { not: productId },
        name: body.name,
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new HttpException(
        "Product name must be unique within seller catalog",
        409,
      );
    }
  }

  // 3. If updating category, validate existence, activity, and leaf status
  if (body.shopping_mall_category_id !== undefined) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        id: body.shopping_mall_category_id,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!category) {
      throw new HttpException(
        "Target category does not exist or is not active",
        400,
      );
    }
    // check for children (leaf status)
    const hasChildren =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: { parent_id: body.shopping_mall_category_id, deleted_at: null },
      });
    if (hasChildren) {
      throw new HttpException(
        "Category must be a leaf (no subcategories)",
        400,
      );
    }
  }

  // 4. Build update payload
  const now = toISOStringSafe(new Date());
  const update: Record<string, unknown> = {
    updated_at: now,
  };
  if (body.name !== undefined) update["name"] = body.name;
  if (body.description !== undefined) update["description"] = body.description;
  if (body.is_active !== undefined) update["is_active"] = body.is_active;
  if (body.shopping_mall_category_id !== undefined)
    update["shopping_mall_category_id"] = body.shopping_mall_category_id;
  if (body.main_image_url !== undefined)
    update["main_image_url"] = body.main_image_url;

  // 5. Update DB
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: productId },
    data: update,
  });

  // 6. Return response (map to DTO)
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    is_active: updated.is_active,
    main_image_url:
      updated.main_image_url === null ? undefined : updated.main_image_url,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
