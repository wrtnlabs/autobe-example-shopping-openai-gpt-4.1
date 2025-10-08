import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdReviewsReviewIdReplies(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReply.ICreate;
}): Promise<IShoppingMallReviewReply> {
  const now = toISOStringSafe(new Date());

  // 1. Load product owned by authenticated seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }

  // 2. Load review and ensure it exists for this product
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!review) {
    throw new HttpException(
      "Not Found: Review does not exist for this product",
      404,
    );
  }

  // 3. Enforce only one reply per review per seller
  const existing = await MyGlobal.prisma.shopping_mall_review_replies.findFirst(
    {
      where: {
        shopping_mall_review_id: props.reviewId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (existing) {
    throw new HttpException(
      "A reply for this review by this seller already exists",
      409,
    );
  }

  // 4. Create the seller reply
  const created = await MyGlobal.prisma.shopping_mall_review_replies.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_admin_id: null,
      body: props.body.body,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reviewId: created.shopping_mall_review_id,
    productId: props.productId,
    sellerId: created.shopping_mall_seller_id ?? undefined,
    adminId: created.shopping_mall_admin_id ?? undefined,
    body: created.body,
    status: created.status as "public" | "hidden",
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
