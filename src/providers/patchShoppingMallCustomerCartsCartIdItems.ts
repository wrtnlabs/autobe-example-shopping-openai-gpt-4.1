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

export async function patchShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem> {
  // Authorization: Ensure the cart belongs to the customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!cart || cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: Cart does not belong to the current user.",
      403,
    );
  }

  // Pagination params
  const limitRaw = props.body.limit;
  const pageRaw = props.body.page;
  const limit = limitRaw !== undefined ? Number(limitRaw) : 20;
  const page = pageRaw !== undefined ? Number(pageRaw) : 1;
  const skip = (page - 1) * limit;

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (props.body.sort) {
    const m = String(props.body.sort).match(/^(\w+)(?:\s+(asc|desc))?$/i);
    if (m) {
      const allowedFields = ["created_at", "quantity", "updated_at"];
      const f = m[1];
      const dir = m[2]?.toLowerCase() === "asc" ? "asc" : "desc";
      if (allowedFields.indexOf(f) !== -1) {
        orderBy = {};
        orderBy[f] = dir;
      }
    }
  }

  // Filter conditions
  const where: Record<string, any> = {
    shopping_mall_cart_id: props.cartId,
    deleted_at: null,
  };
  if (props.body.shopping_mall_product_id !== undefined) {
    where.shopping_mall_product_id = props.body.shopping_mall_product_id;
  }
  if (
    props.body.shopping_mall_product_variant_id !== undefined &&
    props.body.shopping_mall_product_variant_id !== null
  ) {
    where.shopping_mall_product_variant_id =
      props.body.shopping_mall_product_variant_id;
  }
  if (
    (props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null) ||
    (props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null)
  ) {
    where.created_at = {};
    if (
      props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
    ) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (
      props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
    ) {
      where.created_at.lte = props.body.created_at_to;
    }
  }

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({ where }),
  ]);

  // Format result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / (limit || 1))),
    },
    data: rows.map((item) => {
      const resultItem: IShoppingMallCartItem = {
        id: item.id,
        shopping_mall_cart_id: item.shopping_mall_cart_id,
        shopping_mall_product_id: item.shopping_mall_product_id,
        quantity: item.quantity,
        option_snapshot: item.option_snapshot,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
      };
      if (
        item.shopping_mall_product_variant_id !== undefined &&
        item.shopping_mall_product_variant_id !== null
      ) {
        resultItem.shopping_mall_product_variant_id =
          item.shopping_mall_product_variant_id;
      }
      if (item.deleted_at !== undefined && item.deleted_at !== null) {
        resultItem.deleted_at = toISOStringSafe(item.deleted_at);
      }
      return resultItem;
    }),
  };
}
