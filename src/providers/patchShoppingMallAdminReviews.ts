import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviews(props: {
  admin: AdminPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const {
    product_id,
    customer_id,
    seller_id,
    status,
    rating_min,
    rating_max,
    created_from,
    created_to,
    search,
    page,
    limit,
    order_by,
  } = props.body;

  // Pagination defaults
  const pageNumber = page ?? 1;
  const pageSize = limit ?? 20;
  const skip = (pageNumber - 1) * pageSize;
  const take = pageSize;

  // Valid sort fields; fallback default created_at desc
  const sortFields = [
    "created_at",
    "rating",
    "moderation_status",
    "shopping_mall_product_id",
    "shopping_mall_customer_id",
  ];
  const isValidSort =
    typeof order_by === "string" && sortFields.includes(order_by);

  const orderByKey = isValidSort ? order_by : "created_at";
  const orderBy = [{ [orderByKey]: "desc" }];

  // Build where clause
  const where = {
    deleted_at: null,
    ...(product_id !== undefined && { shopping_mall_product_id: product_id }),
    ...(customer_id !== undefined && {
      shopping_mall_customer_id: customer_id,
    }),
    ...(seller_id !== undefined &&
      seller_id !== null && {
        shopping_mall_seller_id: seller_id,
      }),
    ...(status !== undefined && { moderation_status: status }),
    ...(rating_min !== undefined || rating_max !== undefined
      ? {
          rating: {
            ...(rating_min !== undefined && { gte: rating_min }),
            ...(rating_max !== undefined && { lte: rating_max }),
          },
        }
      : {}),
    ...(created_from !== undefined || created_to !== undefined
      ? {
          created_at: {
            ...(created_from !== undefined && { gte: created_from }),
            ...(created_to !== undefined && { lte: created_to }),
          },
        }
      : {}),
    ...(typeof search === "string" && search.trim().length > 0
      ? {
          OR: [{ body: { contains: search } }, { title: { contains: search } }],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_order_id: true,
        shopping_mall_customer_id: true,
        rating: true,
        title: true,
        moderation_status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({ where }),
  ]);

  const data = rows.map((review) => ({
    id: review.id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_order_id: review.shopping_mall_order_id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    rating: review.rating,
    title: review.title ?? null,
    moderation_status: review.moderation_status,
    created_at: toISOStringSafe(review.created_at),
  }));

  return {
    pagination: {
      current: Number(pageNumber),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
