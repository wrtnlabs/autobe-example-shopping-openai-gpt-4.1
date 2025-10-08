import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdSkusSkuIdInventoryLogs(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryLog.IRequest;
}): Promise<IPageIShoppingMallInventoryLog> {
  // Validate product existence
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);

  // Validate SKU existence & association
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.skuId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sku) throw new HttpException("SKU not found", 404);

  // Find the corresponding inventory_record_id for the given SKU
  const inventoryRecord =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirst({
      where: { shopping_mall_product_sku_id: props.skuId },
      select: { id: true },
    });
  if (!inventoryRecord)
    return {
      pagination: {
        current: Number(props.body.page ?? 1),
        limit: Number(props.body.limit ?? 100),
        records: 0,
        pages: 0,
      },
      data: [],
    };

  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build WHERE clause *after* having inventoryRecord
  const where: Record<string, unknown> = {
    shopping_mall_inventory_record_id: inventoryRecord.id,
    ...(props.body.change_type && { change_type: props.body.change_type }),
    ...(props.body.reference_id && { reference_id: props.body.reference_id }),
    ...(props.body.reason && { reason: { contains: props.body.reason } }),
    ...(props.body.created_from || props.body.created_to
      ? {
          created_at: {
            ...(props.body.created_from && { gte: props.body.created_from }),
            ...(props.body.created_to && { lte: props.body.created_to }),
          },
        }
      : {}),
  };
  if (props.body.actor_type === "admin") {
    where.shopping_mall_admin_id = { not: null };
  } else if (props.body.actor_type === "seller") {
    where.shopping_mall_seller_id = { not: null };
  }

  // Allowed sorting fields
  const allowedSortFields = [
    "created_at",
    "change_type",
    "quantity_changed",
    "reason",
    "reference_id",
  ];
  let sortField = "created_at";
  let sortOrder: Prisma.SortOrder = "desc";
  if (props.body.sort) {
    let key = props.body.sort;
    let direction: Prisma.SortOrder = "asc";
    if (key.startsWith("-")) {
      direction = "desc";
      key = key.slice(1);
    } else if (key.startsWith("+")) {
      key = key.slice(1);
    }
    if (allowedSortFields.includes(key)) {
      sortField = key as typeof sortField;
      sortOrder = direction;
    }
  }

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_logs.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_inventory_logs.count({ where }),
  ]);

  const data = logs.map((log) => ({
    id: log.id,
    shopping_mall_inventory_record_id: log.shopping_mall_inventory_record_id,
    shopping_mall_seller_id: log.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: log.shopping_mall_admin_id ?? undefined,
    change_type: log.change_type,
    quantity_changed: log.quantity_changed,
    reason: log.reason ?? undefined,
    reference_id: log.reference_id ?? undefined,
    created_at: toISOStringSafe(log.created_at),
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
