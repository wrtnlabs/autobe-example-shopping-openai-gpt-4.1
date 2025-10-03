import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdInquiriesInquiryId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find an existing, non-deleted inquiry for the given productId and inquiryId.
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findFirst({
      where: {
        id: props.inquiryId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });

  if (!inquiry) {
    throw new HttpException(
      "Product inquiry not found or already deleted.",
      404,
    );
  }

  // Perform soft delete by setting deleted_at to current time (ISO string).
  await MyGlobal.prisma.shopping_mall_product_inquiries.update({
    where: { id: props.inquiryId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Optionally: Could insert audit log/notification, omitted as not in required DTO/SDK.
}
