import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { IPageIShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoin";
import { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of coin (digital wallet) ledgers with advanced
 * filtering and sorting capabilities.
 *
 * Coin entities track reward, promotional, or internal credits both for users
 * and sellers. This search endpoint allows administrators to search for ledgers
 * based on owner (customer or seller), available balance, creation/update
 * dates, or business metadata. The operation supports sophisticated search
 * queries for business workflows, settlement, and auditing. It returns a
 * paginated result set, suitable for dashboards.
 *
 * Requires administrator authentication. Only admins with proper credentials
 * can access this endpoint.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload (validated by
 *   controller/decorator)
 * @param props.body - Search filters, pagination, and sorting parameters for
 *   coin ledgers
 * @returns Paginated results listing found coin ledger entities
 * @throws {Error} When admin is not authenticated
 */
export async function patch__shoppingMallAiBackend_admin_coins(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCoin.IRequest;
}): Promise<IPageIShoppingMallAiBackendCoin> {
  const { admin, body } = props;

  // Extract and default pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Build usable_coin filter
  let usableCoinRange: { gte?: number; lte?: number } | undefined = undefined;
  if (
    body.min_usable_coin !== undefined ||
    body.max_usable_coin !== undefined
  ) {
    usableCoinRange = {
      ...(body.min_usable_coin !== undefined && { gte: body.min_usable_coin }),
      ...(body.max_usable_coin !== undefined && { lte: body.max_usable_coin }),
    };
  }

  // Build created_at filter
  let createdAtRange:
    | {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      }
    | undefined = undefined;
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    createdAtRange = {
      ...(body.created_from !== undefined &&
        body.created_from !== null && { gte: body.created_from }),
      ...(body.created_to !== undefined &&
        body.created_to !== null && { lte: body.created_to }),
    };
  }

  // Compose where clause
  const where = {
    deleted_at: null,
    ...(body.shopping_mall_ai_backend_customer_id !== undefined &&
      body.shopping_mall_ai_backend_customer_id !== null && {
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id,
      }),
    ...(body.shopping_mall_ai_backend_seller_id !== undefined &&
      body.shopping_mall_ai_backend_seller_id !== null && {
        shopping_mall_ai_backend_seller_id:
          body.shopping_mall_ai_backend_seller_id,
      }),
    ...(usableCoinRange && { usable_coin: usableCoinRange }),
    ...(createdAtRange && { created_at: createdAtRange }),
  };

  // Retrieve data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coins.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coins.count({ where }),
  ]);

  // Map results to DTO structure with date conversion
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_customer_id:
      row.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      row.shopping_mall_ai_backend_seller_id ?? null,
    total_accrued: row.total_accrued,
    usable_coin: row.usable_coin,
    expired_coin: row.expired_coin,
    on_hold_coin: row.on_hold_coin,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
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
