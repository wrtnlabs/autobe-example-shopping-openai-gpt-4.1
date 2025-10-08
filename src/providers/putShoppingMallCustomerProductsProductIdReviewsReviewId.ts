import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_product_id: props.productId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!review) {
    throw new HttpException(
      "Review not found for this product and customer",
      404,
    );
  }
  if (review.status === "rejected" || review.status === "hidden") {
    throw new HttpException(
      "Review cannot be edited after moderation lock or permanent rejection.",
      403,
    );
  }
  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating ?? review.rating,
      body: props.body.body ?? review.body,
      status: "pending",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    rating: updated.rating,
    body: updated.body,
    status: updated.status,
    comment: updated.comment ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
