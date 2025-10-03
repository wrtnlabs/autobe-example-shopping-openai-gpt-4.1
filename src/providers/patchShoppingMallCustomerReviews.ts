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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const { customer, body } = props;

  // Authorization: customers may only view their own reviews
  if (body.customer_id !== undefined && body.customer_id !== customer.id) {
    throw new HttpException("You may only view your own reviews.", 403);
  }

  // Valid order_by fields
  const allowedOrderBy = ["created_at", "rating"];
  let orderByField = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";
  if (body.order_by !== undefined) {
    let field = body.order_by.trim();
    if (field.startsWith("-")) {
      orderByDirection = "desc";
      field = field.slice(1);
    } else if (field.startsWith("+")) {
      orderByDirection = "asc";
      field = field.slice(1);
    }
    if (!allowedOrderBy.includes(field)) {
      throw new HttpException("Unsupported order_by field.", 400);
    }
    orderByField = field;
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build dynamic where object
  const where: Record<string, any> = {
    deleted_at: null,
    shopping_mall_customer_id: customer.id,
  };
  if (body.product_id !== undefined) {
    where.shopping_mall_product_id = body.product_id;
  }
  if (body.seller_id !== undefined && body.seller_id !== null) {
    where.shopping_mall_seller_id = body.seller_id;
  }
  if (body.status !== undefined) {
    where.moderation_status = body.status;
  }
  // Combine rating_min/rating_max
  if (body.rating_min !== undefined || body.rating_max !== undefined) {
    where.rating = {};
    if (body.rating_min !== undefined) where.rating.gte = body.rating_min;
    if (body.rating_max !== undefined) where.rating.lte = body.rating_max;
  }
  if (body.created_from !== undefined || body.created_to !== undefined) {
    where.created_at = {};
    if (body.created_from !== undefined)
      where.created_at.gte = body.created_from;
    if (body.created_to !== undefined) where.created_at.lte = body.created_to;
  }
  if (body.search !== undefined && body.search.trim() !== "") {
    where.OR = [
      { title: { contains: body.search } },
      { body: { contains: body.search } },
    ];
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_product_id: row.shopping_mall_product_id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    rating: row.rating,
    title: Object.prototype.hasOwnProperty.call(row, "title")
      ? (row.title ?? null)
      : null,
    moderation_status: row.moderation_status,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
