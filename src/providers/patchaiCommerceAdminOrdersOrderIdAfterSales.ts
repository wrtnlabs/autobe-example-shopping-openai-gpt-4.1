import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { IPageIAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderAfterSales";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list after-sales service events (ai_commerce_order_after_sales)
 * linked to an order.
 *
 * Provides a paginated, filterable list of after-sales events (returns,
 * exchanges, etc.) for a given order. Available to admin users with
 * platform-wide visibility for compliance, audit, and resolution workflows.
 * Supports advanced search/filtering by type, status, actor, time, and
 * free-text note search.
 *
 * Authorization: Requires AdminPayload (system admin). No further business
 * authorization is needed; admin parameter is required and decorator-guarded.
 *
 * @param props - Request props for retrieval:
 *
 *   - Admin: Authenticated system admin (AdminPayload)
 *   - OrderId: Order UUID for which after-sales events are queried
 *   - Body: Optional pagination and filter parameters
 *
 * @returns Paginated list of after-sales service events matching query,
 *   including full event state and pagination info
 * @throws {Error} On database error or if required parameters are absent
 */
export async function patchaiCommerceAdminOrdersOrderIdAfterSales(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.IRequest;
}): Promise<IPageIAiCommerceOrderAfterSales> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build a type-safe where condition inline (never extract as variable)
  const where = {
    order_id: props.orderId,
    ...(props.body.type !== undefined && { type: props.body.type }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.actor_id !== undefined && { actor_id: props.body.actor_id }),
    ...(props.body.order_item_id !== undefined && {
      order_item_id: props.body.order_item_id,
    }),
    ...(props.body.from_opened_at !== undefined ||
    props.body.to_opened_at !== undefined
      ? {
          opened_at: {
            ...(props.body.from_opened_at !== undefined && {
              gte: props.body.from_opened_at,
            }),
            ...(props.body.to_opened_at !== undefined && {
              lte: props.body.to_opened_at,
            }),
          },
        }
      : {}),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        note: { contains: props.body.search },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_after_sales.findMany({
      where,
      orderBy: { opened_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_after_sales.count({ where }),
  ]);

  // Map data ensuring correct null/undefined for nullable/optional fields, and branding for date-times
  const result: IPageIAiCommerceOrderAfterSales = {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: (total ?? 0) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil((total ?? 0) / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => {
      // opened_at: required string & tags.Format<'date-time'>
      // closed_at: optional (can be undefined or null), but type is (string & tags.Format<'date-time'>) | null | undefined
      const opened_at = toISOStringSafe(row.opened_at);
      const closed_at =
        row.closed_at != null
          ? toISOStringSafe(row.closed_at)
          : row.closed_at === null
            ? null
            : undefined;
      return {
        id: row.id,
        order_id: row.order_id,
        order_item_id:
          row.order_item_id !== undefined && row.order_item_id !== null
            ? row.order_item_id
            : undefined,
        actor_id: row.actor_id,
        type: row.type,
        status: row.status,
        opened_at,
        closed_at,
        note:
          row.note !== undefined && row.note !== null ? row.note : undefined,
      };
    }),
  };

  return result;
}
