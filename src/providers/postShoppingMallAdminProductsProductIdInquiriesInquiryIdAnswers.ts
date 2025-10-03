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

export async function postShoppingMallAdminProductsProductIdInquiriesInquiryIdAnswers(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallInquiryAnswer.ICreate;
}): Promise<IShoppingMallInquiryAnswer> {
  // Check inquiry exists, is for the product, and not soft-deleted
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findUnique({
      where: { id: props.inquiryId },
    });
  if (
    !inquiry ||
    inquiry.deleted_at !== null ||
    inquiry.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException(
      "Inquiry not found or not eligible for answer.",
      404,
    );
  }
  if (inquiry.answered) {
    throw new HttpException("This inquiry already has an answer.", 409);
  }
  const now = toISOStringSafe(new Date());
  const answer = await MyGlobal.prisma.shopping_mall_inquiry_answers.create({
    data: {
      id: v4(),
      shopping_mall_product_inquiry_id: props.inquiryId,
      shopping_mall_admin_id: props.admin.id,
      shopping_mall_seller_id: undefined,
      body: props.body.body,
      moderation_status: props.body.moderation_status ?? "pending",
      official_answer: props.body.official_answer ?? true,
      notified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_product_inquiries.update({
    where: { id: props.inquiryId },
    data: { answered: true, updated_at: now },
  });
  return {
    id: answer.id,
    shopping_mall_product_inquiry_id: answer.shopping_mall_product_inquiry_id,
    shopping_mall_admin_id:
      answer.shopping_mall_admin_id !== null
        ? (answer.shopping_mall_admin_id satisfies string as string)
        : undefined,
    body: answer.body,
    moderation_status: answer.moderation_status,
    official_answer: answer.official_answer,
    notified_at:
      answer.notified_at !== null ? toISOStringSafe(answer.notified_at) : null,
    created_at: toISOStringSafe(answer.created_at),
    updated_at: toISOStringSafe(answer.updated_at),
    deleted_at:
      answer.deleted_at !== null ? toISOStringSafe(answer.deleted_at) : null,
    shopping_mall_seller_id: undefined,
  };
}
