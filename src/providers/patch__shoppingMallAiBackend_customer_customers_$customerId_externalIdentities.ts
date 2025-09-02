import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import { IPageIShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerExternalIdentity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * List/search all external identity providers linked to a customer account.
 *
 * This operation provides a paginated list and search of all external identity
 * connections (social login providers, OAuth links, SSO) for a particular
 * customer account. It is essential for account and security management,
 * enabling users or admins to review, link, or decouple external authentication
 * providers.
 *
 * Each result contains provider information, identity key, time of linkage, and
 * last verified timestamp. The request can filter by provider, link status, or
 * search by provider_key. Pagination enables scalable query for customers with
 * many external logins.
 *
 * The API only returns external identities for the requested customerId.
 * Unauthorized requests or attempts to view another user's data are forbidden
 * and logged for audit.
 *
 * @param props - Customer: Authenticated customer making the request
 *   customerId: The UUID of the customer to list external identities for (must
 *   match authenticated user) body: Filtering and pagination criteria
 * @returns Paginated response including each external identity's summary data
 * @throws {Error} If customer tries to access another user's data
 */
export async function patch__shoppingMallAiBackend_customer_customers_$customerId_externalIdentities(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerExternalIdentity.IRequest;
}): Promise<IPageIShoppingMallAiBackendCustomerExternalIdentity.ISummary> {
  const { customer, customerId, body } = props;

  // Authorization: customer must only access their own external identities
  if (customer.id !== customerId) {
    throw new Error("Forbidden: Cannot access other user external identities");
  }

  // Pagination defaults and normalizing to int32
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where filter (inline, no intermediate)
  const where = {
    customer_id: customerId,
    ...(body.provider !== undefined &&
      body.provider !== null && { provider: body.provider }),
    ...(body.provider_key !== undefined &&
      body.provider_key !== null && { provider_key: body.provider_key }),
    ...((body.linked_from !== undefined && body.linked_from !== null) ||
    (body.linked_to !== undefined && body.linked_to !== null)
      ? {
          linked_at: {
            ...(body.linked_from !== undefined &&
              body.linked_from !== null && { gte: body.linked_from }),
            ...(body.linked_to !== undefined &&
              body.linked_to !== null && { lte: body.linked_to }),
          },
        }
      : {}),
  };

  // Query DB (rows, count) with select projection (no intermediate var)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findMany(
      {
        where,
        orderBy: { linked_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          provider: true,
          linked_at: true,
          last_verified_at: true,
        },
      },
    ),
    MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.count(
      { where },
    ),
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
      provider: row.provider,
      linked_at: toISOStringSafe(row.linked_at),
      last_verified_at:
        row.last_verified_at !== null && row.last_verified_at !== undefined
          ? toISOStringSafe(row.last_verified_at)
          : null,
    })),
  };
}
