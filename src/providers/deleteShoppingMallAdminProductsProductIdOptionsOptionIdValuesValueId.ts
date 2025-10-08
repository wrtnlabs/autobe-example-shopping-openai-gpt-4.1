import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdOptionsOptionIdValuesValueId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate value exists for given product/option/value path
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
      where: {
        id: props.valueId,
        shopping_mall_product_option_id: props.optionId,
        option: {
          shopping_mall_product_id: props.productId,
        },
      },
      include: {
        option: true,
      },
    });
  if (!optionValue) {
    throw new HttpException("Product option value not found", 404);
  }

  // 2. Ensure this value is not in use by any SKU
  const usedSkuMapping =
    await MyGlobal.prisma.shopping_mall_product_sku_option_values.findFirst({
      where: {
        shopping_mall_product_option_value_id: props.valueId,
        sku: {
          deleted_at: null,
          product: { deleted_at: null },
        },
      },
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
    });
  if (usedSkuMapping) {
    throw new HttpException(
      "Option value cannot be deleted: It is currently associated with an existing SKU.",
      409,
    );
  }

  // 3. Perform hard delete
  await MyGlobal.prisma.shopping_mall_product_option_values.delete({
    where: {
      id: props.valueId,
    },
  });

  // 4. Audit admin action log
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action_type: "delete_option_value",
      action_reason: "Admin delete of product option value.",
      domain: "product",
      affected_product_id: props.productId,
      details_json: JSON.stringify({
        option_id: props.optionId,
        value_id: props.valueId,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
