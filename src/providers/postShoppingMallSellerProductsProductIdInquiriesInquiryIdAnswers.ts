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

export async function postShoppingMallSellerProductsProductIdInquiriesInquiryIdAnswers(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallInquiryAnswer.ICreate;
}): Promise<IShoppingMallInquiryAnswer> {
  const now = toISOStringSafe(new Date());

  // 1. Validate the inquiry exists and is for seller's product
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findFirst({
      where: {
        id: props.inquiryId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_seller_id: true,
        answered: true,
      },
    });
  if (inquiry === null) {
    throw new HttpException(
      "Inquiry not found or does not belong to product",
      404,
    );
  }
  // Check seller owns the product (seller is only allowed to answer own inquiries)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException("Seller does not own this product.", 403);
  }
  // 2. Check no official/unique answer already exists (exclusive answer policy)
  const existing =
    await MyGlobal.prisma.shopping_mall_inquiry_answers.findFirst({
      where: {
        shopping_mall_product_inquiry_id: props.inquiryId,
        official_answer: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Inquiry already has an official answer.", 409);
  }
  // 3. Create the answer
  const created = await MyGlobal.prisma.shopping_mall_inquiry_answers.create({
    data: {
      id: v4(),
      shopping_mall_product_inquiry_id: props.inquiryId,
      shopping_mall_seller_id: props.seller.id,
      body: props.body.body,
      moderation_status: props.body.moderation_status ?? "pending",
      official_answer: props.body.official_answer ?? true,
      created_at: now,
      updated_at: now,
    },
  });
  // 4. Mark inquiry as answered (locker)
  await MyGlobal.prisma.shopping_mall_product_inquiries.update({
    where: { id: props.inquiryId },
    data: { answered: true, updated_at: now },
  });
  // 5. Return full answer row with precise typing
  return {
    id: created.id,
    shopping_mall_product_inquiry_id: created.shopping_mall_product_inquiry_id,
    shopping_mall_seller_id:
      created.shopping_mall_seller_id === null
        ? undefined
        : (created.shopping_mall_seller_id satisfies string as string),
    shopping_mall_admin_id: undefined,
    body: created.body,
    moderation_status: created.moderation_status,
    official_answer: created.official_answer,
    notified_at: created.notified_at
      ? toISOStringSafe(created.notified_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
