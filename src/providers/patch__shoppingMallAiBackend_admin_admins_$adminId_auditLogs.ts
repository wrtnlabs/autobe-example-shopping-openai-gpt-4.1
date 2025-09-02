import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";
import { IPageIShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdminAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of admin audit logs for a specific
 * administrator.
 *
 * This API allows administrators to retrieve a filtered and paginated view of
 * their own audit trails documenting privileged actions undertaken on the
 * platform. The endpoint supports complex queries, including searching by
 * operation type, date range, and affected entity. Results can be ordered by
 * most recent, oldest, or specific business attributes, with access restricted
 * to admin users for compliance and traceability.
 *
 * The operation returns a paginated list of audit entries, each including
 * operation type, description, the affected entity (target_id, target_type),
 * optional rationale, and timestamp. Only privileged admin users may access or
 * query this data, and sensitive entries may be further filtered based on
 * business logic or regulatory policy.
 *
 * This endpoint is useful for personal activity review, compliance reporting,
 * anomaly detection, or post-hoc audit/self-assessment, and is a key feature
 * for enforcing platform integrity and regulatory accountability.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user making the request
 * @param props.adminId - Unique identifier of the administrator whose audit
 *   logs are being queried (UUID)
 * @param props.body - Search, filter, and pagination criteria for admin audit
 *   logs
 * @returns Paginated and filtered list of admin audit log entries for the
 *   specified administrator
 * @throws {Error} When the requesting admin does not match the target adminId
 */
export async function patch__shoppingMallAiBackend_admin_admins_$adminId_auditLogs(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendAdminAuditLog.IRequest;
}): Promise<IPageIShoppingMallAiBackendAdminAuditLog.ISummary> {
  const { admin, adminId, body } = props;

  // Authorization: Allow only self-query
  if (admin.id !== adminId)
    throw new Error("Unauthorized: You can only view your own audit logs");

  // Defaults and pagination
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;

  // Inline Prisma parameters only (no extracted where/orderBy variables)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_admin_audit_logs.findMany({
      where: {
        admin_id: adminId,
        ...(body.operation && { operation: body.operation }),
        ...(body.description && {
          description: {
            contains: body.description,
            mode: "insensitive" as const,
          },
        }),
        ...((body.created_from || body.created_to) && {
          created_at: {
            ...(body.created_from && { gte: body.created_from }),
            ...(body.created_to && { lte: body.created_to }),
          },
        }),
      },
      orderBy: { created_at: "desc" as const },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        operation: true,
        target_id: true,
        target_type: true,
        description: true,
        created_at: true,
        admin_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_admin_audit_logs.count({
      where: {
        admin_id: adminId,
        ...(body.operation && { operation: body.operation }),
        ...(body.description && {
          description: {
            contains: body.description,
            mode: "insensitive" as const,
          },
        }),
        ...((body.created_from || body.created_to) && {
          created_at: {
            ...(body.created_from && { gte: body.created_from }),
            ...(body.created_to && { lte: body.created_to }),
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => ({
      id: row.id,
      operation: row.operation,
      target_id: row.target_id,
      target_type: row.target_type,
      description: row.description ?? null,
      created_at: toISOStringSafe(row.created_at),
      admin_id: row.admin_id,
    })),
  };
}
