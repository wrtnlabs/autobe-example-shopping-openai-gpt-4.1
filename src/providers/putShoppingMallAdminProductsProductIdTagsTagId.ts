import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdTagsTagId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
  body: IShoppingMallProductTag.IUpdate;
}): Promise<IShoppingMallProductTag> {
  // 1. Find tag by tagId and verify association with productId
  const tag = await MyGlobal.prisma.shopping_mall_product_tags.findUnique({
    where: { id: props.tagId },
  });
  if (!tag || tag.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Tag not found for this product", 404);
  }

  // 2. Check uniqueness (enforce unique tag within the same product, excluding self)
  const duplicate = await MyGlobal.prisma.shopping_mall_product_tags.findFirst({
    where: {
      shopping_mall_product_id: props.productId,
      tag: props.body.tag,
      NOT: { id: props.tagId },
    },
  });
  if (duplicate) {
    throw new HttpException(
      "This tag value already exists for the product.",
      409,
    );
  }

  // 3. Update tag
  const updated = await MyGlobal.prisma.shopping_mall_product_tags.update({
    where: { id: props.tagId },
    data: { tag: props.body.tag },
  });

  // 4. Return updated tag in correct DTO structure
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    tag: updated.tag,
  };
}
