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

export async function getShoppingMallAdminProductsProductIdTagsTagId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductTag> {
  const tag = await MyGlobal.prisma.shopping_mall_product_tags.findFirst({
    where: {
      id: props.tagId,
      shopping_mall_product_id: props.productId,
    },
  });
  if (!tag)
    throw new HttpException("Tag not found or does not belong to product", 404);
  return {
    id: tag.id,
    shopping_mall_product_id: tag.shopping_mall_product_id,
    tag: tag.tag,
  };
}
