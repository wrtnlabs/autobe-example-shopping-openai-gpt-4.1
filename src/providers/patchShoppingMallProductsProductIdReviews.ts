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

export async function patchShoppingMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const { productId, body } = props;

  // Validate and parse pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (page < 1) throw new HttpException("Page must be >= 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);
  const skip = (page - 1) * limit;

  // Prisma where filter build
  const where = {
    shopping_mall_product_id: productId,
    deleted_at: null,
    ...(body.status ? { status: body.status } : {}),
    ...(body.rating !== undefined ? { rating: body.rating } : {}),
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from ? { gte: body.created_from } : {}),
            ...(body.created_to ? { lte: body.created_to } : {}),
          },
        }
      : {}),
  };

  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" };
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";
  if (!["created_at", "rating"].includes(sortBy))
    throw new HttpException("Invalid sort_by", 400);
  if (!["asc", "desc"].includes(sortOrder))
    throw new HttpException("Invalid sort_order", 400);
  orderBy = { [sortBy]: sortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        rating: true,
        status: true,
        body: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      status: row.status,
      body: row.body,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
