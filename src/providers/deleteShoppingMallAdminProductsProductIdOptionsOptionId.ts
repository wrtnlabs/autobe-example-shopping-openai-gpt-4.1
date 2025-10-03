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
  // Retrieve option for validation and audit
  const option = await MyGlobal.prisma.shopping_mall_product_options.findUnique(
    {
      where: { id: props.optionId },
    },
  );
  if (
    !option ||
    option.deleted_at !== null ||
    option.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException("Option not found", 404);
  }

  // Prevent deletion if any active option_values (simulate variant usage constraint)
  const activeOptionValues =
    await MyGlobal.prisma.shopping_mall_product_option_values.count({
      where: {
        shopping_mall_product_option_id: props.optionId,
        deleted_at: null,
      },
    });
  if (activeOptionValues > 0) {
    throw new HttpException("Option in use by active option values", 409);
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_product_options.update({
    where: { id: props.optionId },
    data: { deleted_at: now },
  });

  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "product_option",
      entity_id: props.optionId,
      event_type: "delete",
      actor_id: props.admin.id,
      event_result: "success",
      event_time: now,
      created_at: now,
    },
  });
}
