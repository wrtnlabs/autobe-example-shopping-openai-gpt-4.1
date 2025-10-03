import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdTagsTagId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Ensure the tag exists and is linked to the correct product
  const tagEntry = await MyGlobal.prisma.shopping_mall_product_tags.findFirst({
    where: {
      id: props.tagId,
      shopping_mall_product_id: props.productId,
    },
  });
  if (!tagEntry) {
    throw new HttpException(
      "Tag association not found for the given product.",
      404,
    );
  }
  // Step 2: Delete the tag permanently
  await MyGlobal.prisma.shopping_mall_product_tags.delete({
    where: {
      id: props.tagId,
    },
  });
}
