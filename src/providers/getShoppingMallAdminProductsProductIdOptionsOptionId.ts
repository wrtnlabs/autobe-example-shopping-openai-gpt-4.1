import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdOptionsOptionId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductOption> {
  const { productId, optionId } = props;

  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: optionId,
      shopping_mall_product_id: productId,
    },
  });

  if (!option) {
    throw new HttpException(
      "Product option not found under specified product.",
      404,
    );
  }

  return {
    id: option.id,
    shopping_mall_product_id: option.shopping_mall_product_id,
    name: option.name,
    required: option.required,
    position: option.position,
    created_at: toISOStringSafe(option.created_at),
    updated_at: toISOStringSafe(option.updated_at),
    deleted_at:
      option.deleted_at === null ? null : toISOStringSafe(option.deleted_at),
  };
}
