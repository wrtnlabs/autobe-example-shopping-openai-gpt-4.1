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

export async function patchShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem> {
  const { customer, body } = props;

  // Attempt to determine cartId
  let cartId = body.cartId;
  if (cartId !== undefined && cartId !== null) {
    // Ownership authorization: cart must belong to this customer
    const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
      where: {
        id: cartId,
        shopping_mall_customer_id: customer.id,
      },
      select: { id: true },
    });
    if (!cart) {
      return {
        pagination: {
          current: Number(body.page ?? 1),
          limit: Number(body.limit ?? 20),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    cartId = cart.id;
  } else {
    const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
      where: {
        shopping_mall_customer_id: customer.id,
      },
      select: { id: true },
    });
    if (!cart) {
      return {
        pagination: {
          current: Number(body.page ?? 1),
          limit: Number(body.limit ?? 20),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    cartId = cart.id;
  }

  // Build where filter
  let where: Record<string, any> = {
    shopping_mall_cart_id: cartId,
  };

  if (body.skuId !== undefined && body.skuId !== null) {
    where.shopping_mall_product_sku_id = body.skuId;
  }

  // Product filter
  if (body.productId !== undefined && body.productId !== null) {
    const skusForProduct =
      await MyGlobal.prisma.shopping_mall_product_skus.findMany({
        where: { shopping_mall_product_id: body.productId },
        select: { id: true },
      });
    const productSkuIds = skusForProduct.map((x) => x.id);
    if (productSkuIds.length === 0) {
      return {
        pagination: {
          current: Number(body.page ?? 1),
          limit: Number(body.limit ?? 20),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.shopping_mall_product_sku_id = { in: productSkuIds };
  }

  // Search filter
  if (body.search !== undefined && body.search !== null && body.search !== "") {
    const skusMatched =
      await MyGlobal.prisma.shopping_mall_product_skus.findMany({
        where: { name: { contains: body.search } },
        select: { id: true },
      });
    const productsMatched =
      await MyGlobal.prisma.shopping_mall_products.findMany({
        where: { name: { contains: body.search } },
        select: { id: true },
      });
    let skuIdsFromProducts: { id: string }[] = [];
    if (productsMatched.length > 0) {
      skuIdsFromProducts =
        await MyGlobal.prisma.shopping_mall_product_skus.findMany({
          where: {
            shopping_mall_product_id: { in: productsMatched.map((x) => x.id) },
          },
          select: { id: true },
        });
    }
    const searchSkuIds = [
      ...skusMatched.map((x) => x.id),
      ...skuIdsFromProducts.map((x) => x.id),
    ];
    if (searchSkuIds.length === 0) {
      return {
        pagination: {
          current: Number(body.page ?? 1),
          limit: Number(body.limit ?? 20),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.shopping_mall_product_sku_id = { in: searchSkuIds };
  }

  // Handle sorting
  const sort = body.sort ?? "added_desc";
  let orderBy: any = undefined;
  if (sort === "added_asc") {
    orderBy = { created_at: "asc" };
  } else if (sort === "added_desc") {
    orderBy = { created_at: "desc" };
  } else if (sort === "price_asc") {
    orderBy = { unit_price_snapshot: "asc" };
  } else if (sort === "price_desc") {
    orderBy = { unit_price_snapshot: "desc" };
  }

  // Pagination
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Query in parallel
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({ where }),
  ]);

  let finalRows = rows;

  // Manual name sort (requires joining to SKU)
  if (sort === "name_asc" || sort === "name_desc") {
    const skuIds = finalRows.map((row) => row.shopping_mall_product_sku_id);
    let nameMap = new Map<string, string>();
    if (skuIds.length > 0) {
      const skus = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
        where: { id: { in: skuIds } },
        select: { id: true, name: true },
      });
      for (const sku of skus) {
        nameMap.set(sku.id, sku.name);
      }
    }
    finalRows = [...finalRows].sort((a, b) => {
      const aName = nameMap.get(a.shopping_mall_product_sku_id) ?? "";
      const bName = nameMap.get(b.shopping_mall_product_sku_id) ?? "";
      return sort === "name_asc"
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    });
  }

  return {
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: count === 0 ? 0 : Math.ceil(count / limit),
    },
    data: finalRows.map((item) => ({
      id: item.id,
      shopping_mall_cart_id: item.shopping_mall_cart_id,
      shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
      quantity: item.quantity,
      unit_price_snapshot: item.unit_price_snapshot,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
