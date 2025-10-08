import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const { customer, body } = props;

  // Find the customer's wishlist (there can be at most one).
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      shopping_mall_customer_id: customer.id,
    },
  });

  if (!wishlist) {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const safeLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * safeLimit;

  const validOrderFields = ["created_at", "updated_at"];
  const sortField = validOrderFields.includes(body.orderBy ?? "")
    ? body.orderBy!
    : "updated_at";
  const sortDir = body.orderDirection === "asc" ? "asc" : "desc";

  // Build filtering for products (attached to wishlist items)
  const productWhere: Record<string, unknown> = {
    deleted_at: null,
    is_active: true,
  };
  if (body.categoryId !== undefined) {
    productWhere.shopping_mall_category_id = body.categoryId;
  }
  if (body.search !== undefined && body.search.length > 0) {
    productWhere.OR = [
      { name: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  // Find wishlist items matching the filter (to compute total and for pagination)
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: {
        shopping_mall_wishlist_id: wishlist.id,
        product: productWhere,
      },
      orderBy: { [sortField]: sortDir },
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: {
        shopping_mall_wishlist_id: wishlist.id,
        product: productWhere,
      },
    }),
  ]);

  // The summary result: always return a list with the wishlist summary if filtered items exist, else empty
  const data =
    total > 0
      ? [
          {
            id: wishlist.id,
            shopping_mall_customer_id: wishlist.shopping_mall_customer_id,
            created_at: toISOStringSafe(wishlist.created_at),
            updated_at: toISOStringSafe(wishlist.updated_at),
          },
        ]
      : [];

  const pages = total > 0 ? Math.ceil(total / safeLimit) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(safeLimit),
      records: total,
      pages,
    },
    data,
  };
}
