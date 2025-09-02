import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import { IPageIShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerExternalIdentity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

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
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.customerId - UUID of the target customer for external identity
 *   listing
 * @param props.body - Search, filter, and pagination criteria for external
 *   identities
 * @returns Paginated response including each external identity's summary data.
 * @throws {Error} When the Prisma operation fails or unauthorized access
 *   occurs.
 */
export async function patch__shoppingMallAiBackend_admin_customers_$customerId_externalIdentities(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomerExternalIdentity.IRequest;
}): Promise<IPageIShoppingMallAiBackendCustomerExternalIdentity.ISummary> {
  const { customerId, body } = props;
  // Use validated/optional pagination fallback if controller didn't enforce
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

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

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_customer_external_identities.findMany(
      {
        where,
        orderBy: { linked_at: "desc" },
        skip: (page - 1) * limit,
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

  const data = rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    linked_at: toISOStringSafe(row.linked_at),
    last_verified_at:
      row.last_verified_at != null
        ? toISOStringSafe(row.last_verified_at)
        : null,
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
