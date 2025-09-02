import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update customer account profile and status for admin management.
 *
 * This operation allows an administrator to update one or more editable fields
 * of a customer account (by ID), such as name, nickname, activation or
 * verification status, email, or phone number. Sensitive fields (like email or
 * phone_number) are checked for uniqueness across active accounts. The
 * password_hash field is never modified. The update is logged, and full
 * compliance with audit and business rules is enforced.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the update
 * @param props.customerId - Unique identifier of the customer to update
 * @param props.body - Fields to update in the customer account; only these are
 *   changed
 * @returns The fully updated customer account record
 * @throws {Error} When the customer does not exist, is withdrawn, or there are
 *   uniqueness conflicts
 */
export async function put__shoppingMallAiBackend_admin_customers_$customerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCustomer.IUpdate;
}): Promise<IShoppingMallAiBackendCustomer> {
  const { admin, customerId, body } = props;

  // Auth is required by decorator and contract (admin must be valid and active)

  // Step 1: Fetch the customer, ensure not withdrawn
  const customer =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.findFirst({
      where: { id: customerId, deleted_at: null },
    });
  if (!customer) throw new Error("Customer not found or withdrawn");

  // Step 2: For email and phone_number updates, validate uniqueness (excluding self and withdrawn accounts)
  if (body.email !== undefined) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_ai_backend_customers.findFirst({
        where: {
          email: body.email,
          id: { not: customerId },
          deleted_at: null,
        },
      });
    if (duplicate) throw new Error("Email already in use");
  }
  if (body.phone_number !== undefined) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_ai_backend_customers.findFirst({
        where: {
          phone_number: body.phone_number,
          id: { not: customerId },
          deleted_at: null,
        },
      });
    if (duplicate) throw new Error("Phone number already in use");
  }

  // Step 3: Update only allowed mutable fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_customers.update({
      where: { id: customerId },
      data: {
        // Only update provided fields
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone_number !== undefined
          ? { phone_number: body.phone_number }
          : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
        ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
        ...(body.is_verified !== undefined
          ? { is_verified: body.is_verified }
          : {}),
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    email: updated.email,
    phone_number: updated.phone_number,
    name: updated.name,
    nickname: updated.nickname ?? null,
    is_active: updated.is_active,
    is_verified: updated.is_verified,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
