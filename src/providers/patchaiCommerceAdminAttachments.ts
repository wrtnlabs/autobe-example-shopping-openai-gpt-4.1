import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachments";
import { IPageIAiCommerceAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceAttachments";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and paginate uploaded attachments for review
 * (ai_commerce_attachments).
 *
 * Retrieves a paginated list of attachments, filtering by user, business type,
 * status, filename, and created date. Admins can audit or monitor submitted
 * platform files for compliance and operational reviews. Soft-deleted records
 * are excluded. All timestamps are returned as ISO 8601 strings.
 *
 * @param props - The request containing the authenticated admin and the
 *   filter/pagination body
 * @param props.admin - Authenticated admin user
 * @param props.body - Request filtering and paging criteria
 *   (IAiCommerceAttachments.IRequest)
 * @returns Paginated result with filtered attachment list and pagination info
 * @throws {Error} If any Prisma/database/internal error occurs
 */
export async function patchaiCommerceAdminAttachments(props: {
  admin: AdminPayload;
  body: IAiCommerceAttachments.IRequest;
}): Promise<IPageIAiCommerceAttachments> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause for Prisma filtering
  const where = {
    deleted_at: null,
    ...(body.user_id !== undefined &&
      body.user_id !== null && {
        user_id: body.user_id,
      }),
    ...(body.business_type !== undefined &&
      body.business_type !== null && {
        business_type: body.business_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.filename_like !== undefined &&
      body.filename_like !== null && {
        filename: { contains: body.filename_like },
      }),
    ...(((body.created_at_from !== undefined &&
      body.created_at_from !== null) ||
      (body.created_at_to !== undefined && body.created_at_to !== null)) && {
      created_at: {
        ...(body.created_at_from !== undefined &&
          body.created_at_from !== null && {
            gte: body.created_at_from,
          }),
        ...(body.created_at_to !== undefined &&
          body.created_at_to !== null && {
            lte: body.created_at_to,
          }),
      },
    }),
  };

  // Query rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_attachments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_attachments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => {
      const deleted_at =
        row.deleted_at !== undefined && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : undefined;
      return {
        id: row.id,
        user_id: row.user_id,
        filename: row.filename,
        business_type: row.business_type,
        status: row.status,
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
        ...(deleted_at !== undefined ? { deleted_at: deleted_at } : {}),
      };
    }),
  };
}
