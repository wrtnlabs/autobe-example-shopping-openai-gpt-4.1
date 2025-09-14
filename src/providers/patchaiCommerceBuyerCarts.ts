import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import { IPageIAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCart";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and retrieve a paginated list of shopping carts (ai_commerce_carts)
 * with advanced filtering.
 *
 * Retrieves a paginated, filterable list of shopping carts belonging to the
 * authenticated buyer, supporting advanced filters on cart status, quantity,
 * creation/update timestamps, and store associations. Only the authenticated
 * buyer can access their own carts.
 *
 * @param props - The request properties.
 * @param props.buyer - The authenticated buyer requesting their cart data.
 * @param props.body - Filtering and pagination options for searching shopping
 *   carts.
 * @returns Paginated search results for shopping carts matching the filter
 *   criteria, with summary information suitable for user experience and
 *   management flows.
 * @throws {Error} If database query fails, or critical infrastructure errors
 *   occur.
 */
export async function patchaiCommerceBuyerCarts(props: {
  buyer: BuyerPayload;
  body: IAiCommerceCart.IRequest;
}): Promise<IPageIAiCommerceCart.ISummary> {
  const { buyer, body } = props;
  // Default pagination values
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Only allow sorting by explicit keys
  const allowedSortKeys = [
    "created_at",
    "updated_at",
    "total_quantity",
    "status",
  ];
  const sortRaw = body.sort ?? "created_at";
  const sortKey = allowedSortKeys.includes(sortRaw) ? sortRaw : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Build filtering criteria
  const where = {
    deleted_at: null,
    buyer_id: buyer.id,
    ...(body.status ? { status: body.status } : {}),
    ...(body.store_id ? { store_id: body.store_id } : {}),
    ...(body.min_quantity !== undefined
      ? { total_quantity: { gte: body.min_quantity } }
      : {}),
    ...(body.max_quantity !== undefined
      ? {
          total_quantity: {
            ...(body.min_quantity !== undefined
              ? { gte: body.min_quantity }
              : {}),
            lte: body.max_quantity,
          },
        }
      : {}),
    ...(body.created_from && !body.created_to
      ? { created_at: { gte: body.created_from } }
      : {}),
    ...(body.created_to && !body.created_from
      ? { created_at: { lte: body.created_to } }
      : {}),
    ...(body.created_from && body.created_to
      ? { created_at: { gte: body.created_from, lte: body.created_to } }
      : {}),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_carts.findMany({
      where,
      orderBy: { [sortKey]: sortOrder },
      select: {
        id: true,
        status: true,
        total_quantity: true,
        updated_at: true,
        store_id: true,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_carts.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((row) => ({
      id: row.id,
      status: row.status,
      total_quantity: row.total_quantity,
      updated_at: toISOStringSafe(row.updated_at),
      store_id: row.store_id ?? null,
    })),
  };
}
