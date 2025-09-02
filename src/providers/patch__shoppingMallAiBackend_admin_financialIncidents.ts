import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFinancialIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFinancialIncident";
import { IPageIShoppingMallAiBackendFinancialIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFinancialIncident";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and paginate financial incident records for compliance and audit
 * purposes.
 *
 * Retrieve a paginated, filtered list of financial incident and anomaly records
 * for deposits, mileage, or coin ledgers. This API empowers administrators to
 * efficiently audit, investigate, and review incident logs, supporting
 * compliance, fraud detection, and root cause analysis for financial operations
 * within the mall.
 *
 * Access is strictly restricted to administrators due to the sensitive
 * compliance and personal data involved. Implements advanced filtering by
 * incident type (e.g., fraud, compliance_audit, withdrawal_dispute), status
 * (open, closed, investigating, resolved), business entities (deposit, mileage,
 * coin, customer, seller), and date ranges. Pagination and sorting are
 * configurable for business monitoring dashboards.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Search filters and pagination/sort criteria for financial
 *   incidents
 * @returns Paginated result of financial incident summaries matching filter
 *   criteria
 * @throws {Error} When admin is unauthorized (already handled by authentication
 *   provider)
 */
export async function patch__shoppingMallAiBackend_admin_financialIncidents(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendFinancialIncident.IRequest;
}): Promise<IPageIShoppingMallAiBackendFinancialIncident.ISummary> {
  const { admin, body } = props;

  // Ensure admin access enforced by provider (Double-layered for doc/test clarity)
  if (!admin || !admin.id) throw new Error("Unauthorized");

  // Destructure for readability
  const {
    id,
    shopping_mall_ai_backend_deposit_id,
    shopping_mall_ai_backend_mileage_id,
    shopping_mall_ai_backend_coin_id,
    shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_seller_id,
    incident_type,
    status,
    details,
    created_at_from,
    created_at_to,
    resolved_at_from,
    resolved_at_to,
    page: bodyPage,
    limit: bodyLimit,
    order_by: bodyOrderBy,
    direction: bodyDirection,
  } = body;

  const page = bodyPage ?? 1;
  const limit = bodyLimit ?? 20;
  const skip = (page - 1) * limit;
  const order_by = bodyOrderBy ?? "created_at";
  const direction = bodyDirection === "asc" ? "asc" : "desc";

  // Construct where clause immutably with only supplied filters
  const where = {
    deleted_at: null,
    ...(id !== undefined && { id }),
    ...(shopping_mall_ai_backend_deposit_id !== undefined && {
      shopping_mall_ai_backend_deposit_id,
    }),
    ...(shopping_mall_ai_backend_mileage_id !== undefined && {
      shopping_mall_ai_backend_mileage_id,
    }),
    ...(shopping_mall_ai_backend_coin_id !== undefined && {
      shopping_mall_ai_backend_coin_id,
    }),
    ...(shopping_mall_ai_backend_customer_id !== undefined && {
      shopping_mall_ai_backend_customer_id,
    }),
    ...(shopping_mall_ai_backend_seller_id !== undefined && {
      shopping_mall_ai_backend_seller_id,
    }),
    ...(incident_type !== undefined && { incident_type }),
    ...(status !== undefined && { status }),
    ...(details !== undefined &&
      details.length > 0 && {
        details: { contains: details, mode: "insensitive" as const },
      }),
    ...(created_at_from !== undefined || created_at_to !== undefined
      ? {
          created_at: {
            ...(created_at_from !== undefined && { gte: created_at_from }),
            ...(created_at_to !== undefined && { lte: created_at_to }),
          },
        }
      : {}),
    ...(resolved_at_from !== undefined || resolved_at_to !== undefined
      ? {
          resolved_at: {
            ...(resolved_at_from !== undefined && { gte: resolved_at_from }),
            ...(resolved_at_to !== undefined && { lte: resolved_at_to }),
          },
        }
      : {}),
  };

  // Query for paged data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_financial_incidents.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [order_by]: direction },
      select: {
        id: true,
        incident_type: true,
        status: true,
        created_at: true,
        resolved_at: true,
        external_reference: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_financial_incidents.count({
      where,
    }),
  ]);

  // Map results - all date fields rendered with toISOStringSafe, check nullable
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      incident_type: row.incident_type,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      resolved_at: row.resolved_at ? toISOStringSafe(row.resolved_at) : null,
      external_reference: row.external_reference ?? null,
    })),
  };
}
