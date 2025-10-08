import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdOptionsOptionId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId, optionId } = props;

  // Step 1: Validate option exists and belongs to the product
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: optionId,
      shopping_mall_product_id: productId,
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (!option) {
    throw new HttpException(
      "Product option not found for the specified product.",
      404,
    );
  }

  // Step 2: Collect all option value IDs for this option
  const optionValueIds =
    await MyGlobal.prisma.shopping_mall_product_option_values.findMany({
      where: { shopping_mall_product_option_id: optionId },
      select: { id: true },
    });
  const optionValueIdList = optionValueIds.map((v) => v.id);

  // Step 3: Check if any SKUs reference any value of this option
  if (optionValueIdList.length > 0) {
    const usedBySku =
      await MyGlobal.prisma.shopping_mall_product_sku_option_values.findFirst({
        where: {
          shopping_mall_product_option_value_id: { in: optionValueIdList },
        },
        select: { id: true },
      });
    if (usedBySku) {
      throw new HttpException(
        "This option cannot be deleted because it is currently used by one or more SKUs. Please update or remove affected SKUs before deleting this option.",
        409,
      );
    }
  }

  // Step 4: Hard delete the option
  await MyGlobal.prisma.shopping_mall_product_options.delete({
    where: { id: optionId },
  });

  // Step 5: Audit log
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: admin.id,
      action_type: "delete_product_option",
      action_reason: "Permanently deleted product option via API.",
      domain: "product_option",
      affected_product_id: productId,
      details_json: JSON.stringify({ option_id: optionId, name: option.name }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
