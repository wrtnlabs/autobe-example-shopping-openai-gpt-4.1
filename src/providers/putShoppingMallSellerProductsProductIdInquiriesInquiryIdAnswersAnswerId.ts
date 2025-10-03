import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiryAnswer";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdInquiriesInquiryIdAnswersAnswerId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
  body: IShoppingMallInquiryAnswer.IUpdate;
}): Promise<IShoppingMallInquiryAnswer> {
  // 1. Fetch and check the answer exists, matches inquiryId/productId and seller is author
  const answer = await MyGlobal.prisma.shopping_mall_inquiry_answers.findUnique(
    {
      where: { id: props.answerId },
      select: {
        id: true,
        shopping_mall_product_inquiry_id: true,
        shopping_mall_seller_id: true,
        shopping_mall_admin_id: true,
        created_at: true,
        updated_at: true,
        notified_at: true,
        deleted_at: true,
        body: true,
        moderation_status: true,
        official_answer: true,
      },
    },
  );
  if (!answer || answer.shopping_mall_product_inquiry_id !== props.inquiryId) {
    throw new HttpException("Answer not found for this inquiry", 404);
  }
  if (
    !answer.shopping_mall_seller_id ||
    answer.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException(
      "Unauthorized: Only the original seller can update their answer",
      403,
    );
  }
  // Update fields, excluding moderation_reason (not in schema)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_inquiry_answers.update({
    where: { id: props.answerId },
    data: {
      body: props.body.body,
      moderation_status: props.body.moderation_status ?? undefined,
      official_answer: props.body.official_answer ?? undefined,
      updated_at: now,
    },
  });
  // Return all defined/allowed output fields as per IShoppingMallInquiryAnswer type
  return {
    id: updated.id,
    shopping_mall_product_inquiry_id: updated.shopping_mall_product_inquiry_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: updated.shopping_mall_admin_id ?? undefined,
    body: updated.body,
    moderation_status: updated.moderation_status,
    official_answer: updated.official_answer,
    notified_at: updated.notified_at
      ? toISOStringSafe(updated.notified_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
