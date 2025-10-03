import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiryAnswer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdInquiriesInquiryIdAnswersAnswerId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
  body: IShoppingMallInquiryAnswer.IUpdate;
}): Promise<IShoppingMallInquiryAnswer> {
  const { admin, productId, inquiryId, answerId, body } = props;

  // Lookup answer by ID
  const answer = await MyGlobal.prisma.shopping_mall_inquiry_answers.findUnique(
    {
      where: { id: answerId },
    },
  );
  if (!answer || answer.deleted_at !== null) {
    throw new HttpException("Answer not found or already deleted", 404);
  }
  // Fetch the inquiry for additional context validation
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findUnique({
      where: { id: answer.shopping_mall_product_inquiry_id },
    });
  if (
    !inquiry ||
    inquiry.id !== inquiryId ||
    inquiry.shopping_mall_product_id !== productId
  ) {
    throw new HttpException("Context mismatch for answer", 400);
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_inquiry_answers.update({
    where: { id: answerId },
    data: {
      body: body.body,
      moderation_status:
        body.moderation_status !== undefined
          ? body.moderation_status
          : undefined,
      // moderation_reason: property removed as it's not recognized by Prisma schema
      official_answer:
        body.official_answer !== undefined ? body.official_answer : undefined,
      updated_at: now,
    },
  });

  // NOTE: The schema does not define the shopping_mall_inquiry_answers_snapshots table; if it exists, snapshot should be recorded here.

  return {
    id: updated.id,
    shopping_mall_product_inquiry_id: updated.shopping_mall_product_inquiry_id,
    shopping_mall_seller_id:
      updated.shopping_mall_seller_id !== undefined &&
      updated.shopping_mall_seller_id !== null
        ? updated.shopping_mall_seller_id
        : undefined,
    shopping_mall_admin_id:
      updated.shopping_mall_admin_id !== undefined &&
      updated.shopping_mall_admin_id !== null
        ? updated.shopping_mall_admin_id
        : undefined,
    body: updated.body,
    moderation_status: updated.moderation_status,
    official_answer: updated.official_answer,
    notified_at:
      updated.notified_at !== undefined && updated.notified_at !== null
        ? toISOStringSafe(updated.notified_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
