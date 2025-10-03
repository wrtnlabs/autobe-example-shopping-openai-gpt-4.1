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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerReviews(props: {
  seller: SellerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  // Normalize page and limit values
  const page =
    typeof props.body.page === "number" && props.body.page > 0
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" && props.body.limit > 0
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  // Get the seller row to relate sellerPayload.id (customer_id) to seller PK
  const sellerRow = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      shopping_mall_customer_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sellerRow) throw new HttpException("Seller not found", 404);

  // Build Prisma where condition (no Record<string, any>, inline only)
  const where: any = {
    deleted_at: null,
    product: { shopping_mall_seller_id: sellerRow.id },
  };
  if (props.body.product_id !== undefined) {
    where.shopping_mall_product_id = props.body.product_id;
  }
  if (props.body.customer_id !== undefined) {
    where.shopping_mall_customer_id = props.body.customer_id;
  }
  if (props.body.seller_id !== undefined && props.body.seller_id !== null) {
    where.shopping_mall_seller_id = props.body.seller_id;
  }
  if (props.body.status !== undefined) {
    where.moderation_status = props.body.status;
  }
  // Ratings
  if (
    props.body.rating_min !== undefined &&
    props.body.rating_max !== undefined
  ) {
    where.rating = { gte: props.body.rating_min, lte: props.body.rating_max };
  } else if (props.body.rating_min !== undefined) {
    where.rating = { gte: props.body.rating_min };
  } else if (props.body.rating_max !== undefined) {
    where.rating = { lte: props.body.rating_max };
  }
  // created_at
  if (
    props.body.created_from !== undefined &&
    props.body.created_to !== undefined
  ) {
    where.created_at = {
      gte: props.body.created_from,
      lte: props.body.created_to,
    };
  } else if (props.body.created_from !== undefined) {
    where.created_at = { gte: props.body.created_from };
  } else if (props.body.created_to !== undefined) {
    where.created_at = { lte: props.body.created_to };
  }
  // Search
  if (props.body.search !== undefined && props.body.search.length > 0) {
    where.OR = [
      { body: { contains: props.body.search } },
      { title: { contains: props.body.search } },
    ];
  }

  // order_by
  const allowedSortFields = ["created_at", "rating"];
  const requestedOrder =
    typeof props.body.order_by === "string" &&
    allowedSortFields.includes(props.body.order_by)
      ? props.body.order_by
      : "created_at";
  const orderBy: any = { [requestedOrder]: "desc" };

  // Parallel: fetch and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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

  const data: IShoppingMallReview.ISummary[] = rows.map((row) => ({
    id: row.id,
    shopping_mall_product_id: row.shopping_mall_product_id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    rating: row.rating,
    title: typeof row.title === "string" ? row.title : (row.title ?? null),
    moderation_status: row.moderation_status,
    created_at: toISOStringSafe(row.created_at),
  }));

  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
