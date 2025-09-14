import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponAudit";
import { IPageIAiCommerceCouponAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCouponAudit";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of coupon audit logs from
 * ai_commerce_coupon_audits.
 *
 * This operation fetches a paginated, filtered set of coupon audit logs,
 * supporting advanced query parameters including coupon ID, event type,
 * timestamp range, event reference, sorting, and pagination. Authorization is
 * enforced for admin users only. All timestamp values are returned as ISO8601
 * strings without using the Date type anywhere in the codebase. The
 * implementation uses only fields present in the Prisma schema and DTO, and
 * respects all null/undefined conventions and branded type constraints for type
 * safety.
 *
 * @param props - Contains admin authentication and audit log search parameters
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Filtering, search, sort, and pagination params
 * @returns Paginated coupon audit logs (IPageIAiCommerceCouponAudit)
 * @throws {Error} If database error or authorization failure occurs
 */
export async function patchaiCommerceAdminCouponAudits(props: {
  admin: AdminPayload;
  body: IAiCommerceCouponAudit.IRequest;
}): Promise<IPageIAiCommerceCouponAudit> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Compose event_timestamp filter block if needed
  let eventTimestampCond: { gte?: string; lte?: string } | undefined =
    undefined;
  if (
    body.event_timestamp_start !== undefined &&
    body.event_timestamp_end !== undefined
  ) {
    eventTimestampCond = {
      gte: body.event_timestamp_start,
      lte: body.event_timestamp_end,
    };
  } else if (body.event_timestamp_start !== undefined) {
    eventTimestampCond = { gte: body.event_timestamp_start };
  } else if (body.event_timestamp_end !== undefined) {
    eventTimestampCond = { lte: body.event_timestamp_end };
  }

  // Build where clause (fully inline, never type-annotated)
  const where = {
    ...(body.coupon_id !== undefined && { coupon_id: body.coupon_id }),
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.event_reference !== undefined && {
      event_reference: body.event_reference,
    }),
    ...(eventTimestampCond !== undefined && {
      event_timestamp: eventTimestampCond,
    }),
  };

  const orderBy = { event_timestamp: body.sort === "asc" ? "asc" : "desc" };

  // Run both queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_coupon_audits.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_coupon_audits.count({ where }),
  ]);

  // Strict map to DTO, always use toISOStringSafe for event_timestamp
  const data = rows.map((row) => ({
    id: row.id,
    coupon_id: row.coupon_id,
    event_type: row.event_type,
    event_reference: row.event_reference ?? undefined,
    note: row.note ?? undefined,
    event_timestamp: toISOStringSafe(row.event_timestamp),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
