import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentFraudEvent";
import { IPageIAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePaymentFraudEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and paginate payment fraud events from
 * ai_commerce_payment_fraud_events.
 *
 * This operation enables fraud compliance teams and admins to retrieve
 * filtered, paginated payment fraud events using flexible query and pagination
 * criteria. Filters include event_code, entity_type, status, partial
 * description, detection date range, customizable sort, and strict non-deleted
 * enforcement.
 *
 * Only accessible with valid admin authentication (props.admin). Results are
 * suitable for compliance dashboards and legal reporting. All date/datetime
 * fields are output as ISO8601 strings, never as native Date.
 *
 * @param props - Request object
 * @param props.admin - Authenticated admin context (required)
 * @param props.body - IAiCommercePaymentFraudEvent.IRequest search and
 *   pagination criteria
 * @returns Paginated and filtered results of payment fraud audit logs, with all
 *   fields type-strictly output and paginated.
 * @throws {Error} If unauthenticated or insufficient permission.
 */
export async function patchaiCommerceAdminPaymentFraudEvents(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentFraudEvent.IRequest;
}): Promise<IPageIAiCommercePaymentFraudEvent> {
  const { body } = props;
  const page = typeof body.page === "number" ? body.page : 1;
  const limit = typeof body.limit === "number" ? body.limit : 20;
  const where = {
    deleted_at: null,
    ...(body.event_code !== undefined &&
      body.event_code !== null &&
      body.event_code.length > 0 && { event_code: body.event_code }),
    ...(body.entity_type !== undefined &&
      body.entity_type !== null &&
      body.entity_type.length > 0 && { entity_type: body.entity_type }),
    ...(body.status !== undefined &&
      body.status !== null &&
      body.status.length > 0 && { status: body.status }),
    ...(body.description !== undefined &&
      body.description !== null &&
      body.description.length > 0 && {
        description: { contains: body.description },
      }),
    ...((body.detected_at_start !== undefined &&
      body.detected_at_start !== null) ||
    (body.detected_at_end !== undefined && body.detected_at_end !== null)
      ? {
          detected_at: {
            ...(body.detected_at_start !== undefined &&
              body.detected_at_start !== null && {
                gte: body.detected_at_start,
              }),
            ...(body.detected_at_end !== undefined &&
              body.detected_at_end !== null && { lte: body.detected_at_end }),
          },
        }
      : {}),
  };
  const orderBy = [{ detected_at: body.sort === "asc" ? "asc" : "desc" }];
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_payment_fraud_events.findMany({
      where,
      orderBy,
      skip: Number(page - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_payment_fraud_events.count({ where }),
  ]);
  const data = rows.map((event) => ({
    id: event.id,
    event_code: event.event_code,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    status: event.status,
    description: event.description === null ? undefined : event.description,
    detected_at: toISOStringSafe(event.detected_at),
    reviewed_at:
      event.reviewed_at === null
        ? undefined
        : toISOStringSafe(event.reviewed_at),
    created_at: toISOStringSafe(event.created_at),
    updated_at: toISOStringSafe(event.updated_at),
    deleted_at:
      event.deleted_at === null ? undefined : toISOStringSafe(event.deleted_at),
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
