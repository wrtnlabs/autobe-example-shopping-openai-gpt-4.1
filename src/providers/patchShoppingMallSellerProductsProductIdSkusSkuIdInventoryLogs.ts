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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdSkusSkuIdInventoryLogs(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryLog.IRequest;
}): Promise<IPageIShoppingMallInventoryLog> {
  const { seller, productId, skuId, body } = props;

  // 1. Find product, ensure owned by seller and not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException(
      "Unauthorized: Product not found or not owned by seller",
      403,
    );
  }

  // 2. Find SKU, ensure belongs to product and not deleted
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: skuId,
      shopping_mall_product_id: productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sku) {
    throw new HttpException("SKU not found for this product", 403);
  }

  // 3. Find inventory record for this SKU (should be only one per SKU)
  const inventoryRecord =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirst({
      where: {
        shopping_mall_product_sku_id: skuId,
      },
      select: { id: true },
    });
  if (!inventoryRecord) {
    throw new HttpException("Inventory record not found for SKU", 404);
  }

  // 4. Build filter where clause for inventory logs
  const filter: Record<string, unknown> = {
    shopping_mall_inventory_record_id: inventoryRecord.id,
  };
  // Filtering: change_type
  if (body.change_type) {
    filter.change_type = body.change_type;
  }
  // Filtering: actor_type (seller/admin)
  if (body.actor_type === "seller") {
    filter.shopping_mall_seller_id = seller.id;
  } else if (body.actor_type === "admin") {
    filter.shopping_mall_admin_id = { not: null };
  }
  // Filtering: created_from / created_to
  if (body.created_from && body.created_to) {
    filter.created_at = {
      gte: body.created_from,
      lte: body.created_to,
    };
  } else if (body.created_from) {
    filter.created_at = {
      gte: body.created_from,
    };
  } else if (body.created_to) {
    filter.created_at = {
      lte: body.created_to,
    };
  }
  // Filtering: reference_id
  if (body.reference_id) {
    filter.reference_id = body.reference_id;
  }
  // Filtering: reason (partial match)
  if (body.reason) {
    filter.reason = {
      contains: body.reason,
      // No mode: "insensitive" for cross-db
    };
  }

  // 5. Sorting
  let orderBy;
  const allowedSortFields = new Set([
    "created_at",
    "quantity_changed",
    "change_type",
  ]);
  const sort = body.sort ?? "-created_at";
  let sortField = sort.replace(/^[-+]/, "");
  if (!allowedSortFields.has(sortField)) {
    sortField = "created_at";
  }
  // Descending if starts with -; ascending if + or no prefix
  const sortOrder = sort.startsWith("-") ? "desc" : "asc";
  orderBy = {
    [sortField]: sortOrder,
  };

  // 6. Pagination (default page/limit)
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 100;
  const skip = (page - 1) * limit;

  // 7. Query inventory logs and total for pagination
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_logs.findMany({
      where: filter,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_inventory_record_id: true,
        shopping_mall_seller_id: true,
        shopping_mall_admin_id: true,
        change_type: true,
        quantity_changed: true,
        reason: true,
        reference_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_inventory_logs.count({
      where: filter,
    }),
  ]);

  // 8. Map to DTO type strictly (no Date type or type assertions)
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

  // 9. Compose pagination response with type fix (strip tags for pure number)
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
