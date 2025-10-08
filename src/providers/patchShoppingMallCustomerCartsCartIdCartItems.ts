import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCartsCartIdCartItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const { customer, cartId, body } = props;

  // Step 1: Verify the cart belongs to the requesting customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: cartId },
    select: { shopping_mall_customer_id: true },
  });
  if (!cart || cart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own cart",
      403,
    );
  }

  // Step 2: Pagination params
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Step 3: Build where clause
  const where: any = {
    shopping_mall_cart_id: cartId,
  };

  if (body.productId !== undefined) {
    // Need to filter on productId via join: get all sku ids for product
    const skuIds = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where: {
        product: { id: body.productId },
      },
      select: { id: true },
    });
    const ids = skuIds.map((x) => x.id);
    if (ids.length === 0) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.shopping_mall_product_sku_id = { in: ids };
  }

  if (body.skuId !== undefined) {
    where.shopping_mall_product_sku_id = body.skuId;
  }

  // Ignore 'search': not directly possible on cart_items (SEARCH would require a join to skus/products for name...), skip here.

  // Step 4: Sorting
  let orderBy: any = { created_at: "desc" };
  if (body.sort === "added_asc") orderBy = { created_at: "asc" };
  if (body.sort === "added_desc") orderBy = { created_at: "desc" };
  if (body.sort === "name_asc") orderBy = { id: "asc" };
  if (body.sort === "name_desc") orderBy = { id: "desc" };
  if (body.sort === "price_asc") orderBy = { unit_price_snapshot: "asc" };
  if (body.sort === "price_desc") orderBy = { unit_price_snapshot: "desc" };

  // Step 5: Query cart_items and total
  const [data, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({ where }),
  ]);

  // Step 6: Format data
  const result = data.map((item) => ({
    id: item.id,
    shopping_mall_cart_id: item.shopping_mall_cart_id,
    shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
    quantity: item.quantity,
    unit_price_snapshot: item.unit_price_snapshot,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  const pages = Math.ceil(records / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records,
      pages,
    },
    data: result,
  };
}
