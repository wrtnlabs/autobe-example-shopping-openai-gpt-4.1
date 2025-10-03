import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdInquiriesInquiryIdAnswersAnswerId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the answer & validate product/inquiry linkage + ownership
  const answer = await MyGlobal.prisma.shopping_mall_inquiry_answers.findFirst({
    where: {
      id: props.answerId,
      deleted_at: null,
      shopping_mall_product_inquiry_id: props.inquiryId,
    },
    include: {
      inquiry: true, // relation is named 'inquiry', refers to product inquiry
    },
  });
  if (!answer) {
    throw new HttpException("Inquiry answer not found or already deleted", 404);
  }
  if (
    !answer.inquiry ||
    answer.inquiry.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException(
      "Inquiry answer does not match the given product or inquiry",
      404,
    );
  }
  if (answer.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Only the authoring seller can delete this answer",
      403,
    );
  }

  // Soft delete by updating deleted_at (do not use Date, must use branded string)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.shopping_mall_inquiry_answers.update({
    where: { id: props.answerId },
    data: { deleted_at: deletedAt },
  });
}
