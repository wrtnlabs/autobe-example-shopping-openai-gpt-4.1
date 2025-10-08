import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerProductsProductIdReviewsReviewIdFlags(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewFlag.ICreate;
}): Promise<IShoppingMallReviewFlag> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Verify review exists for this product and is not deleted
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new HttpException("Review not found for this product.", 404);
  }

  // 2. Check for existing open flag by this customer for this review
  const existing = await MyGlobal.prisma.shopping_mall_review_flags.findFirst({
    where: {
      shopping_mall_review_id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
      status: "open",
    },
  });
  if (existing) {
    throw new HttpException("You have already flagged this review.", 409);
  }

  // 3. Create the new flag
  const created = await MyGlobal.prisma.shopping_mall_review_flags.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
      reason: props.body.reason,
      note: props.body.note ?? null,
      status: "open",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_review_id: created.shopping_mall_review_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id ?? undefined,
    reason: created.reason,
    note: created.note ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
