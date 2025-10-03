import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdInquiriesInquiryIdAnswersAnswerId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find answer
  const answer = await MyGlobal.prisma.shopping_mall_inquiry_answers.findFirst({
    where: {
      id: props.answerId,
      shopping_mall_product_inquiry_id: props.inquiryId,
      deleted_at: null,
    },
    select: {
      id: true,
      inquiry: {
        select: {
          id: true,
          shopping_mall_product_id: true,
        },
      },
    },
  });
  if (
    !answer ||
    !answer.inquiry ||
    answer.inquiry.id !== props.inquiryId ||
    answer.inquiry.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException(
      "Answer not found for specified product/inquiry, or already deleted",
      404,
    );
  }
  // Soft delete
  await MyGlobal.prisma.shopping_mall_inquiry_answers.update({
    where: { id: props.answerId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
