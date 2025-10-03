import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiryAnswer";

export async function getShoppingMallProductsProductIdInquiriesInquiryIdAnswersAnswerId(props: {
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInquiryAnswer> {
  const { productId, inquiryId, answerId } = props;

  // 1. Fetch the answer row by answerId.
  const answer = await MyGlobal.prisma.shopping_mall_inquiry_answers.findUnique(
    {
      where: { id: answerId },
    },
  );
  if (!answer) throw new HttpException("Inquiry answer not found", 404);

  // 2. Check that shopping_mall_product_inquiry_id matches inquiryId
  if (answer.shopping_mall_product_inquiry_id !== inquiryId)
    throw new HttpException(
      "Inquiry answer does not belong to provided inquiry",
      404,
    );

  // 3. Fetch the inquiry to verify it belongs to productId
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findUnique({
      where: { id: inquiryId },
    });
  if (!inquiry) throw new HttpException("Inquiry not found", 404);
  if (inquiry.shopping_mall_product_id !== productId)
    throw new HttpException("Inquiry does not belong to product", 404);

  // 4. Return all answer fields, handling dates and nulls
  return {
    id: answer.id,
    shopping_mall_product_inquiry_id: answer.shopping_mall_product_inquiry_id,
    shopping_mall_seller_id: answer.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: answer.shopping_mall_admin_id ?? undefined,
    body: answer.body,
    moderation_status: answer.moderation_status,
    official_answer: answer.official_answer,
    notified_at:
      answer.notified_at !== null && answer.notified_at !== undefined
        ? toISOStringSafe(answer.notified_at)
        : undefined,
    created_at: toISOStringSafe(answer.created_at),
    updated_at: toISOStringSafe(answer.updated_at),
    deleted_at:
      answer.deleted_at !== null && answer.deleted_at !== undefined
        ? toISOStringSafe(answer.deleted_at)
        : undefined,
  };
}
