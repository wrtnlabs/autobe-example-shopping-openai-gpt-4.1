import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing payment method in the ai_commerce_payment_methods table.
 *
 * This function allows an authenticated administrator to update the properties
 * of a registered payment method. Administrators may modify the display name,
 * activation status, and advanced configuration payload, as well as update the
 * timestamp for auditing. The operation ensures platform-wide integrity by
 * restricting changes to administrators and only acting on methods that are not
 * soft-deleted. All changes are tracked via updated_at. Attempts to update a
 * non-existent or deleted payment method will result in a clear error.
 *
 * @param props - Input properties for the update operation
 * @param props.admin - Authenticated admin payload performing the update
 * @param props.paymentMethodId - UUID of the payment method to update
 * @param props.body - Fields to update, matching
 *   IAiCommercePaymentMethod.IUpdate
 * @returns The updated IAiCommercePaymentMethod entity
 * @throws {Error} If payment method is not found, deleted, or update fails
 */
export async function putaiCommerceAdminPaymentMethodsPaymentMethodId(props: {
  admin: AdminPayload;
  paymentMethodId: string & tags.Format<"uuid">;
  body: IAiCommercePaymentMethod.IUpdate;
}): Promise<IAiCommercePaymentMethod> {
  const { admin, paymentMethodId, body } = props;

  // Step 1: Validate payment method exists and is not soft-deleted
  const existing = await MyGlobal.prisma.ai_commerce_payment_methods.findFirst({
    where: { id: paymentMethodId, deleted_at: null },
  });
  if (existing === null) {
    throw new Error("Payment method not found or already deleted");
  }

  // Step 2: Apply allowed updates; always update updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_payment_methods.update({
    where: { id: paymentMethodId },
    data: {
      display_name: body.display_name ?? undefined,
      is_active: body.is_active ?? undefined,
      configuration: body.configuration ?? undefined,
      updated_at: now,
    },
  });

  // Step 3: Map returned row to IAiCommercePaymentMethod (all date fields as string)
  return {
    id: updated.id,
    method_code: updated.method_code,
    display_name: updated.display_name,
    is_active: updated.is_active,
    configuration: updated.configuration ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
