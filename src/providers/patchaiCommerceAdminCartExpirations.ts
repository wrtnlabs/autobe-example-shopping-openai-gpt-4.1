import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartExpiration";
import { IPageIAiCommerceCartExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartExpiration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated cart expiration/recovery event records.
 *
 * Retrieves a filtered and paginated collection of cart expiration and recovery
 * records from ai_commerce_cart_expirations, supporting windowed date
 * filtering, event type, and actor-based filtering. This function is intended
 * for operational audit, support, and analytics scenarios. Authorization as an
 * active admin is strictly required.
 *
 * @param props - Function parameter object
 * @param props.admin - Authenticated admin payload (required)
 * @param props.body - Query filter and pagination parameters (optional)
 * @returns Paginated summary list of matching cart expiration/recovery events
 * @throws {Error} If invalid input or database error occurs
 */
export async function patchaiCommerceAdminCartExpirations(props: {
  admin: AdminPayload;
  body: IAiCommerceCartExpiration.IRequest;
}): Promise<IPageIAiCommerceCartExpiration.ISummary> {
  const { body } = props;

  // Compose where-clause for Prisma
  const where: Record<string, any> = {
    ...(body.cart_id !== undefined &&
      body.cart_id !== null && { cart_id: body.cart_id }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
  };

  // Date range filter for created_at (start_date/end_date in 'YYYY-MM-DD' format)
  if (
    (body.start_date !== undefined && body.start_date !== null) ||
    (body.end_date !== undefined && body.end_date !== null)
  ) {
    const createdAt: Record<string, string> = {};
    if (body.start_date !== undefined && body.start_date !== null) {
      // Compose lower bound: start_date at midnight UTC
      createdAt.gte = toISOStringSafe(body.start_date + "T00:00:00.000Z");
    }
    if (body.end_date !== undefined && body.end_date !== null) {
      // Compose upper bound: end_date at end of day UTC
      createdAt.lte = toISOStringSafe(body.end_date + "T23:59:59.999Z");
    }
    where.created_at = createdAt;
  }

  // Pagination logic
  let page = body.page ?? 1;
  if (page < 1) page = 1;
  let limit = body.limit ?? 20;
  if (limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_cart_expirations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_cart_expirations.count({ where }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      cart_id: row.cart_id,
      actor_id: row.actor_id === null ? undefined : row.actor_id,
      event_type: row.event_type,
      details: row.details === null ? undefined : row.details,
      created_at: toISOStringSafe(row.created_at),
    } satisfies IAiCommerceCartExpiration.ISummary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIAiCommerceCartExpiration.ISummary;
}
