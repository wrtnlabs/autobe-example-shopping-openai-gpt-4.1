import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { IPageIShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReply";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdReviewsReviewIdReplies(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReply.IRequest;
}): Promise<IPageIShoppingMallReviewReply> {
  // 1. Validate review exists for product
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!review) throw new HttpException("Review not found for product", 404);

  // 2. Build where filter for replies (filtered by reviewId)
  const where = {
    shopping_mall_review_id: props.reviewId,
    deleted_at: null as null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.authorType === "admin" && {
      shopping_mall_admin_id: { not: null },
    }),
    ...(props.body.authorType === "seller" && {
      shopping_mall_seller_id: { not: null },
    }),
    ...(props.body.body &&
      props.body.body.length > 0 && { body: { contains: props.body.body } }),
  };

  // 3. Fetch replies with parent review to get productId
  const replyRows = await MyGlobal.prisma.shopping_mall_review_replies.findMany(
    {
      where,
      orderBy: { created_at: "desc" },
      include: { review: { select: { shopping_mall_product_id: true } } },
    },
  );

  // 4. Map to DTO
  const data: IShoppingMallReviewReply[] = replyRows.map((r) => ({
    id: r.id,
    reviewId: r.shopping_mall_review_id,
    productId: r.review.shopping_mall_product_id,
    sellerId: r.shopping_mall_seller_id ?? null,
    adminId: r.shopping_mall_admin_id ?? null,
    body: r.body,
    status: r.status === "public" ? "public" : "hidden",
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
    deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
  }));

  // 5. Pagination - dummy (no real page/limit params in IRequest)
  return {
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: 1,
    },
    data,
  };
}
