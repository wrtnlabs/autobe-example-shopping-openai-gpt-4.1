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

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const { seller, body } = props;

  // Validate category exists and is active
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      id: body.shopping_mall_category_id,
      deleted_at: null,
      is_active: true,
    },
  });
  if (!category) {
    throw new HttpException("Invalid or inactive category.", 404);
  }

  // Validate only self-listing
  if (body.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "You may only list products under your own seller id.",
      403,
    );
  }

  // Check uniqueness of name for this seller (excluding deleted)
  const existing = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      shopping_mall_seller_id: seller.id,
      name: body.name,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "Product name already exists for this seller.",
      409,
    );
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create product
  const product = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      shopping_mall_category_id: body.shopping_mall_category_id,
      name: body.name,
      description: body.description,
      is_active: body.is_active,
      main_image_url: body.main_image_url ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    is_active: product.is_active,
    main_image_url: product.main_image_url ?? undefined,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at:
      product.deleted_at !== null && product.deleted_at !== undefined
        ? toISOStringSafe(product.deleted_at)
        : undefined,
  };
}
