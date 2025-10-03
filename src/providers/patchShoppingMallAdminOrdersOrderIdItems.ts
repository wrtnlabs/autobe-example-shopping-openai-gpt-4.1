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
}): Promise<IPageIShoppingMallOrderItem> {
  const { orderId, body } = props;

  const page = body.page ?? (1 as number);
  const limit = body.limit ?? (20 as number);
  const skip = (Number(page) - 1) * Number(limit);

  const where: Record<string, unknown> = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.product_id !== undefined && {
      shopping_mall_product_id: body.product_id,
    }),
  };

  const [rows, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);

  const data = rows.map((it) => ({
    id: it.id,
    shopping_mall_order_id: it.shopping_mall_order_id,
    shopping_mall_product_id: it.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      it.shopping_mall_product_variant_id ?? undefined,
    shopping_mall_seller_id: it.shopping_mall_seller_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
    final_price: it.final_price,
    discount_snapshot: it.discount_snapshot ?? undefined,
    status: it.status,
    created_at: toISOStringSafe(it.created_at),
    updated_at: toISOStringSafe(it.updated_at),
    deleted_at: it.deleted_at ? toISOStringSafe(it.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: count,
      pages: Math.ceil(count / Number(limit)),
    },
    data,
  };
}
