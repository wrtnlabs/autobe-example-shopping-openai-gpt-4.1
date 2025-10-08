import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import { IPageIShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewFlag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdReviewsReviewIdFlags(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewFlag.IRequest;
}): Promise<IPageIShoppingMallReviewFlag.ISummary> {
  const page = 1;
  const limit = 20;

  // Step 1: Verify review exists, belongs to product, and is not deleted
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: { id: true, shopping_mall_product_id: true, deleted_at: true },
  });
  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found.", 404);
  }
  if (review.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Review does not belong to product.", 404);
  }

  // Step 2: Build where clause for flags (for review, not deleted, match reason if provided)
  const where: Record<string, unknown> = {
    shopping_mall_review_id: props.reviewId,
    deleted_at: null,
  };
  if (props.body.reason && props.body.reason.length > 0) {
    where.reason = props.body.reason;
  }

  // Step 3: Query paginated flags and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_flags.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_review_flags.count({ where }),
  ]);

  // Step 4: Map to DTO summaries
  const data = rows.map((flag) => ({
    id: flag.id,
    shopping_mall_review_id: flag.shopping_mall_review_id,
    shopping_mall_customer_id: flag.shopping_mall_customer_id ?? null,
    shopping_mall_seller_id: flag.shopping_mall_seller_id ?? null,
    shopping_mall_admin_id: flag.shopping_mall_admin_id ?? null,
    reason: flag.reason,
    note: flag.note ?? null,
    status: flag.status as "open" | "resolved" | "rejected",
    created_at: toISOStringSafe(flag.created_at),
    updated_at: toISOStringSafe(flag.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 1 : Math.ceil(total / limit),
    },
    data,
  };
}
