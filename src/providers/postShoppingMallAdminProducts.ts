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

export async function postShoppingMallAdminProducts(props: {
  admin: AdminPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const { body } = props;

  // 1. Check for duplicate product name for this seller (unique on seller and name)
  const duplicate = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      shopping_mall_seller_id: body.shopping_mall_seller_id,
      name: body.name,
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException(
      "A product with this name already exists for this seller.",
      409,
    );
  }

  // 2. Check category exists, is active, and is a leaf (no child category referencing it as parent_id)
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: body.shopping_mall_category_id },
  });
  if (!category) {
    throw new HttpException("Invalid category: Not found.", 400);
  }
  if (!category.is_active) {
    throw new HttpException("The specified category is inactive.", 400);
  }
  // category is a leaf if there are no children with parent_id = category.id
  const childCount = await MyGlobal.prisma.shopping_mall_categories.count({
    where: { parent_id: category.id },
  });
  if (childCount > 0) {
    throw new HttpException(
      "Cannot assign a product to a non-leaf category.",
      400,
    );
  }

  // 3. Insert new product
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_seller_id: body.shopping_mall_seller_id,
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

  // 4. Return product DTO
  return {
    id: created.id,
    name: created.name,
    description: created.description,
    is_active: created.is_active,
    main_image_url: created.main_image_url ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
