import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve metadata/details for a single payment method from the
 * ai_commerce_payment_methods table.
 *
 * This operation provides full configuration and audit data for a specific
 * payment method, enabling platform administrators to inspect method code,
 * name, activation state, integration configuration, and associated timestamps
 * for the payment integration/review. Data is admin-restricted and throws when
 * the method does not exist.
 *
 * @param props - The request properties.
 * @param props.admin - The authenticated admin user making the request
 *   (required for authorization).
 * @param props.paymentMethodId - The unique uuid of the payment method to
 *   retrieve.
 * @returns The full IAiCommercePaymentMethod object for the specified payment
 *   method.
 * @throws {Error} When the specified payment method is not found.
 */
export async function getaiCommerceAdminPaymentMethodsPaymentMethodId(props: {
  admin: AdminPayload;
  paymentMethodId: string & tags.Format<"uuid">;
}): Promise<IAiCommercePaymentMethod> {
  const { paymentMethodId } = props;
  const record = await MyGlobal.prisma.ai_commerce_payment_methods.findUnique({
    where: { id: paymentMethodId },
  });
  if (record === null) throw new Error("Payment method not found");

  return {
    id: record.id,
    method_code: record.method_code,
    display_name: record.display_name,
    is_active: record.is_active,
    configuration: record.configuration ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
