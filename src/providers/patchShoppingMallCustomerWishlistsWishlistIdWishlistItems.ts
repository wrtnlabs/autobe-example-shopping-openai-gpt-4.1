import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlistsWishlistIdWishlistItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem> {
  const { customer, wishlistId, body } = props;
  // 1. Ownership check
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      shopping_mall_customer_id: customer.id,
    },
    select: { id: true },
  });
  if (!wishlist)
    throw new HttpException("Unauthorized to access wishlist", 403);

  // 2. Pagination and sort
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Where/filters setup
  const wishlistItemWhere: Record<string, any> = {
    shopping_mall_wishlist_id: wishlistId,
    // No soft delete on wishlist items model
  };

  // created_at (added_after/before)
  if (body.added_after)
    wishlistItemWhere.created_at = {
      ...(wishlistItemWhere.created_at || {}),
      gte: body.added_after,
    };
  if (body.added_before)
    wishlistItemWhere.created_at = {
      ...(wishlistItemWhere.created_at || {}),
      lte: body.added_before,
    };

  // 4. Product filters (product name/category)
  const productWhere: Record<string, any> = {};
  if (body.product_name) productWhere.name = { contains: body.product_name };
  if (body.category_id)
    productWhere.shopping_mall_category_id = body.category_id;

  // 5. Order by
  let orderBy;
  switch (body.sort) {
    case "created_at-asc":
      orderBy = { created_at: "asc" as const };
      break;
    case "updated_at-desc":
      orderBy = { updated_at: "desc" as const };
      break;
    case "updated_at-asc":
      orderBy = { updated_at: "asc" as const };
      break;
    default:
      orderBy = { created_at: "desc" as const };
  }

  // 6. Get [total, rows]
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: {
        ...wishlistItemWhere,
        product: productWhere,
      },
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: {
        ...wishlistItemWhere,
        product: productWhere,
      },
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_wishlist_id: true,
        shopping_mall_product_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  // 7. Data mapping
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_wishlist_id: row.shopping_mall_wishlist_id,
    shopping_mall_product_id: row.shopping_mall_product_id,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
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
