import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerStatusHistory";
import { IPageIAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search/filter the seller status history records
 * (ai_commerce_seller_status_history).
 *
 * This operation retrieves a paginated and filtered list of seller status
 * history records for the requesting seller. Output is strictly limited to
 * status transitions where the user_id matches the authenticated seller.
 * Filtering, pagination, and temporal range controls are provided, returning
 * audit and compliance-ready records.
 *
 * @param props - Request context and input.
 * @param props.seller - Authenticated seller payload specifying target identity
 *   for access control.
 * @param props.body - Filtering, search, and pagination criteria for status
 *   history query.
 * @returns Paginated seller status history records containing transitions,
 *   reasons, actors, and timestamps.
 * @throws {Error} If any unexpected database or permission error occurs.
 */
export async function patchaiCommerceSellerSellerStatusHistory(props: {
  seller: SellerPayload;
  body: IAiCommerceSellerStatusHistory.IRequest;
}): Promise<IPageIAiCommerceSellerStatusHistory> {
  const { seller, body } = props;
  // Only allow sellers to query their own status events; ignore any user_id in body
  const userId = seller.id;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  const where = {
    user_id: userId,
    ...(body.seller_profile_id !== undefined
      ? { seller_profile_id: body.seller_profile_id ?? undefined }
      : {}),
    ...(body.previous_status !== undefined
      ? { previous_status: body.previous_status ?? undefined }
      : {}),
    ...(body.new_status !== undefined
      ? { new_status: body.new_status ?? undefined }
      : {}),
    ...(body.transition_reason !== undefined
      ? { transition_reason: body.transition_reason ?? undefined }
      : {}),
    ...(body.transition_actor !== undefined
      ? { transition_actor: body.transition_actor ?? undefined }
      : {}),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined
              ? { gte: body.created_from }
              : {}),
            ...(body.created_to !== undefined ? { lte: body.created_to } : {}),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_status_history.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_seller_status_history.count({ where }),
  ]);
  // Map rows to strict DTO
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    seller_profile_id:
      row.seller_profile_id === null ? undefined : row.seller_profile_id,
    previous_status:
      row.previous_status === null ? undefined : row.previous_status,
    new_status: row.new_status,
    transition_reason:
      row.transition_reason === null ? undefined : row.transition_reason,
    transition_actor: row.transition_actor,
    created_at: toISOStringSafe(row.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
