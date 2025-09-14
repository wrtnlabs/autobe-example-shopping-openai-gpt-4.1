import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerDispute";
import { IPageIAiCommerceSellerDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerDispute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of seller dispute cases
 * (ai_commerce_seller_disputes).
 *
 * This API provides a robust search interface for retrieving seller disputes,
 * penalties, and escalation records from the ai_commerce_seller_disputes table.
 * Advanced search and filtering criteria are supported, including dispute type
 * (policy violation, payout hold, fraud investigation, etc.), status (open,
 * closed, resolved, escalated), seller profile ID, and time windows for
 * creation or modification.
 *
 * The operation supports pagination, sorting, and intelligent querying,
 * allowing administrators and compliance personnel to focus on relevant dispute
 * categories. Security logic ensures that sellers may only view their own
 * dispute records, while admins are able to access all records for compliance
 * and oversight.
 *
 * @param props - Object containing all necessary parameters for the operation
 *
 *   - Props.admin: The authenticated admin performing this request
 *   - Props.body: The filtering, paging, and sorting parameters for searching
 *       seller disputes
 *
 * @returns Paginated and filtered list of seller dispute summary records with
 *   metadata
 * @throws {Error} If any internal processing, database, or validation error
 *   occurs
 */
export async function patchaiCommerceAdminSellerDisputes(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerDispute.IRequest;
}): Promise<IPageIAiCommerceSellerDispute.ISummary> {
  const {
    seller_profile_id,
    dispute_type,
    status,
    created_from,
    created_to,
    page = 1,
    limit = 20,
    sort,
  } = props.body;

  // Compose the where block with runtime checks (never include null, always deleted_at == null)
  const where = {
    deleted_at: null,
    ...(seller_profile_id !== undefined &&
      seller_profile_id !== null && {
        seller_profile_id,
      }),
    ...(dispute_type !== undefined &&
      dispute_type !== null && {
        dispute_type,
      }),
    ...(status !== undefined &&
      status !== null && {
        status,
      }),
    ...((created_from || created_to) && {
      created_at: {
        ...(created_from && { gte: created_from }),
        ...(created_to && { lte: created_to }),
      },
    }),
  };

  // Restrict sort to only allowed fields; parse order as asc/desc from sign
  const allowedSort = [
    "created_at",
    "updated_at",
    "status",
    "dispute_type",
    "id",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (sort) {
    const sortField = sort.replace(/^[-+]/, "");
    const sortDirection: "asc" | "desc" = sort.startsWith("-") ? "desc" : "asc";
    if (allowedSort.includes(sortField)) {
      orderBy = { [sortField]: sortDirection };
    }
  }

  const current = Number(page) > 0 ? Number(page) : 1;
  const pageLimit = Number(limit) > 0 ? Number(limit) : 20;
  const skip = (current - 1) * pageLimit;
  const take = pageLimit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_disputes.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        seller_profile_id: true,
        dispute_type: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_seller_disputes.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(current),
      limit: Number(pageLimit),
      records: total,
      pages: pageLimit === 0 ? 0 : Math.ceil(total / pageLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      seller_profile_id: row.seller_profile_id,
      dispute_type: row.dispute_type,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
