import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFinancialIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFinancialIncident";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information for a specific financial incident by ID.
 *
 * Allows a system administrator or compliance auditor to retrieve a complete
 * financial incident record by its ID. The operation exposes all stored
 * incident details, including affected entities (deposit, mileage, coin,
 * customer, seller), incident type, current status, descriptive details,
 * associated external references, timestamps, and resolution data.
 *
 * This endpoint is essential for supporting legal investigations, in-depth root
 * cause analysis, and regulatory or audit evidence traceability. Data exposure
 * is restricted to admins due to the sensitivity of compliance and personal
 * information. If the incident is not found or is no longer accessible due to
 * deletion or retention expiry, a clear API error is returned with audit log.
 *
 * Related endpoints include the financial incidents search/index API.
 *
 * @param props - Provider properties
 * @param props.admin - Authenticated admin user payload for authorization
 * @param props.incidentId - Unique identifier (UUID) of the financial incident
 *   to retrieve
 * @returns Detailed business and audit record for a financial incident event
 * @throws {Error} When the admin payload is missing/invalid
 * @throws {Error} When the incident is not found or has been soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_financialIncidents_$incidentId(props: {
  admin: AdminPayload;
  incidentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFinancialIncident> {
  const { admin, incidentId } = props;

  // MANDATORY admin authorization check
  if (!admin) {
    throw new Error("Unauthorized: admin authentication required");
  }

  // Fetch the financial incident by PK
  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_financial_incidents.findUniqueOrThrow(
      {
        where: { id: incidentId },
      },
    );

  // If soft-deleted, don't expose
  if (found.deleted_at) {
    throw new Error("Incident not found or has been deleted");
  }

  return {
    id: found.id,
    shopping_mall_ai_backend_deposit_id:
      found.shopping_mall_ai_backend_deposit_id ?? null,
    shopping_mall_ai_backend_mileage_id:
      found.shopping_mall_ai_backend_mileage_id ?? null,
    shopping_mall_ai_backend_coin_id:
      found.shopping_mall_ai_backend_coin_id ?? null,
    shopping_mall_ai_backend_customer_id:
      found.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      found.shopping_mall_ai_backend_seller_id ?? null,
    incident_type: found.incident_type,
    status: found.status,
    details: found.details,
    external_reference: found.external_reference ?? null,
    created_at: toISOStringSafe(found.created_at),
    resolved_at: found.resolved_at ? toISOStringSafe(found.resolved_at) : null,
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
