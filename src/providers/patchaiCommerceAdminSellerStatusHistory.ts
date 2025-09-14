import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerStatusHistory";
import { IPageIAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and filter the seller status change history across the marketplace.
 * Seller status history includes all onboarding, approvals, suspensions,
 * demotions, appeals, and escalations, with reasons and actor logs. Supports
 * filtering by seller profile, status type, date range, and reason, along with
 * pagination and sorting for large historical records.
 *
 * Available to administrators for platform oversight, and to sellers for their
 * own status history review, subject to role-based access control. All output
 * complies with regulatory requirements for evidence and audit documentation.
 * Sensitive details are only displayed according to the requesting party’s
 * access level.
 *
 * @param props - Request properties.
 * @param props.admin - The authenticated admin making the request
 *   (authorization enforced by decorator).
 * @param props.body - Search, filter, and pagination options for querying
 *   seller status histories.
 * @returns Paginated results of seller status transitions, reasons, and actors
 *   matching the search criteria.
 * @throws {Error} When any unexpected database or runtime error occurs.
 */
export async function patchaiCommerceAdminSellerStatusHistory(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerStatusHistory.IRequest;
}): Promise<IPageIAiCommerceSellerStatusHistory> {
  const { body } = props;
  // Use typia tag compatible types for page and limit
  const page = body.page ?? (1 as number);
  const limit = body.limit ?? (20 as number);
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.seller_profile_id !== undefined &&
      body.seller_profile_id !== null && {
        seller_profile_id: body.seller_profile_id,
      }),
    ...(body.previous_status !== undefined &&
      body.previous_status !== null && {
        previous_status: body.previous_status,
      }),
    ...(body.new_status !== undefined &&
      body.new_status !== null && { new_status: body.new_status }),
    ...(body.transition_reason !== undefined &&
      body.transition_reason !== null && {
        transition_reason: { contains: body.transition_reason },
      }),
    ...(body.transition_actor !== undefined &&
      body.transition_actor !== null && {
        transition_actor: { contains: body.transition_actor },
      }),
    ...(body.created_from !== undefined &&
    body.created_from !== null &&
    body.created_to !== undefined &&
    body.created_to !== null
      ? { created_at: { gte: body.created_from, lte: body.created_to } }
      : body.created_from !== undefined && body.created_from !== null
        ? { created_at: { gte: body.created_from } }
        : body.created_to !== undefined && body.created_to !== null
          ? { created_at: { lte: body.created_to } }
          : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_status_history.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_seller_status_history.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      seller_profile_id: row.seller_profile_id ?? undefined,
      previous_status: row.previous_status ?? undefined,
      new_status: row.new_status,
      transition_reason: row.transition_reason ?? undefined,
      transition_actor: row.transition_actor,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
