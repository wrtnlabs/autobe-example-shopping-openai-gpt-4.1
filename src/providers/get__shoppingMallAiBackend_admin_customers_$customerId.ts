import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves full details of a single customer account for admin audit/support.
 *
 * This endpoint allows administrators to retrieve comprehensive information for
 * a specific customer in the ShoppingMallAiBackend system. It includes profile,
 * contact, status, verification state, and timestamps for account activity. The
 * response is limited to fields required for compliance, support, and account
 * management and excludes any sensitive credentials.
 *
 * @param props - Parameters for this request
 * @param props.admin - The authenticated admin performing the operation
 * @param props.customerId - Unique identifier of the customer to retrieve
 * @returns Complete customer profile information (without credentials)
 * @throws {Error} If the customer is not found or has been removed
 */
export async function get__shoppingMallAiBackend_admin_customers_$customerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCustomer> {
  const { customerId } = props;
  const record =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        phone_number: true,
        name: true,
        nickname: true,
        is_active: true,
        is_verified: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) throw new Error("Customer not found");

  return {
    id: record.id,
    email: record.email,
    phone_number: record.phone_number,
    name: record.name,
    nickname: record.nickname ?? null,
    is_active: record.is_active,
    is_verified: record.is_verified,
    last_login_at:
      typeof record.last_login_at === "object" && record.last_login_at !== null
        ? toISOStringSafe(record.last_login_at)
        : (record.last_login_at ?? null),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      typeof record.deleted_at === "object" && record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : (record.deleted_at ?? null),
  };
}
