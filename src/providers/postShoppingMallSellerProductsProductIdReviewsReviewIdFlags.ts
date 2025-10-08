import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdReviewsReviewIdFlags(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewFlag.ICreate;
}): Promise<IShoppingMallReviewFlag> {
  const now = toISOStringSafe(new Date());
  // 1. Validate target review exists, active (not deleted), and belongs to given product
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
      "Review not found for this product or has been deleted.",
      404,
    );
  }
  // 2. Ensure no unresolved flag exists for this seller/review
  const existingFlag =
    await MyGlobal.prisma.shopping_mall_review_flags.findFirst({
      where: {
        shopping_mall_review_id: props.reviewId,
        shopping_mall_seller_id: props.seller.id,
        status: "open",
      },
      select: { id: true },
    });
  if (existingFlag) {
    throw new HttpException(
      "This seller already has an open flag for this review.",
      409,
    );
  }
  // 3. Create the new review flag
  const created = await MyGlobal.prisma.shopping_mall_review_flags.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_customer_id: undefined,
      shopping_mall_admin_id: undefined,
      reason: props.body.reason,
      note: props.body.note ?? undefined,
      status: "open",
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    shopping_mall_review_id: created.shopping_mall_review_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: created.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: created.shopping_mall_admin_id ?? undefined,
    reason: created.reason,
    note: created.note ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
