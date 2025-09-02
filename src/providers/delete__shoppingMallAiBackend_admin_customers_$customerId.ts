import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Logically delete (withdraw) a customer account (soft delete by setting
 * deleted_at).
 *
 * Marks a customer in ShoppingMallAiBackend as logically deleted (withdrawn) by
 * setting the 'deleted_at' timestamp. Does not erase data but disables further
 * use and login for compliance, abuse, or support scenarios. Intended only for
 * admin role. Idempotent: safely ignores repeat calls if customer is already
 * withdrawn.
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin payload (required for access
 *   control)
 * @param props.customerId - UUID of customer to withdraw
 * @returns Void (nothing)
 * @throws {Error} If customer does not exist (404-style error)
 */
export async function delete__shoppingMallAiBackend_admin_customers_$customerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customerId } = props;
  // Fetch customer by id; throw if not found (404)
  const customer =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.findUnique({
      where: { id: customerId },
      select: { id: true, deleted_at: true },
    });
  if (!customer) throw new Error("Customer not found");
  // Idempotent: if already logically deleted, do nothing
  if (customer.deleted_at !== null && customer.deleted_at !== undefined) {
    return;
  }
  // Set deleted_at to current timestamp (ISO 8601, strict branding)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_ai_backend_customers.update({
    where: { id: customerId },
    data: { deleted_at: now },
  });
}
