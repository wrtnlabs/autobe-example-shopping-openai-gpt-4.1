import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const { admin, orderId, body } = props;

  // 1. Validate order exists (404 if not found)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // 2. Prepare pagination
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // 3. Build where conditions for table fields only
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { refund_status: body.status }),
    ...(body.sku_code !== undefined &&
      body.sku_code !== null && { sku_code: body.sku_code }),
    ...(body.product_name !== undefined &&
      body.product_name !== null && {
        item_name: { contains: body.product_name },
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { item_name: { contains: body.search } },
          { sku_code: { contains: body.search } },
        ],
      }),
  };

  // 4. Prepare orderBy logic. Accept only allowed fields. Default: created_at desc
  let orderBy: { [field: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort && typeof body.sort === "string" && body.sort.length > 0) {
    const sortRaw = body.sort.trim();
    let field = sortRaw.replace(/^[-+]/, "");
    let dir: "asc" | "desc" = sortRaw.startsWith("-") ? "desc" : "asc";
    // Allow only safe fields:
    const ALLOWED = ["created_at", "quantity", "item_name", "sku_code"];
    if (ALLOWED.includes(field)) {
      orderBy = { [field]: dir };
    }
  }

  // 5. Query paginated data and total count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);

  // 6. Map to ISummary (date conversion, deleted_at optional)
  const data = items.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    shopping_mall_product_sku_id: row.shopping_mall_product_sku_id,
    item_name: row.item_name,
    sku_code: row.sku_code,
    quantity: row.quantity,
    unit_price: row.unit_price,
    currency: row.currency,
    item_total: row.item_total,
    refund_status: row.refund_status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
  }));

  // 7. Pagination block (use Number() to strip typia tags)
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
