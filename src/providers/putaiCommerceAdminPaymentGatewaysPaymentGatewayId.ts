import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update properties of an existing payment gateway (admin only) in
 * ai_commerce_payment_gateways.
 *
 * Allows an authenticated admin to update core configuration of a payment
 * gateway. Only admin can access this endpoint. Supports changes to display
 * name, API endpoint, active status, and supported currencies. Immutable fields
 * (id, gateway_code, created_at) cannot be changed.
 *
 * @param props - The request, including authenticated admin, paymentGatewayId
 *   to update, and update body.
 * @param props.admin - Admin authentication context (validated by decorator).
 * @param props.paymentGatewayId - UUID of the payment gateway to update.
 * @param props.body - Fields to update (display_name, api_endpoint, is_active,
 *   supported_currencies).
 * @returns The updated IAiCommercePaymentGateway record with all current
 *   properties (dates are ISO8601 strings).
 * @throws {Error} If payment gateway is not found or has been deleted.
 */
export async function putaiCommerceAdminPaymentGatewaysPaymentGatewayId(props: {
  admin: AdminPayload;
  paymentGatewayId: string & tags.Format<"uuid">;
  body: IAiCommercePaymentGateway.IUpdate;
}): Promise<IAiCommercePaymentGateway> {
  const { admin, paymentGatewayId, body } = props;

  // Only non-deleted gateway can be updated
  const gateway = await MyGlobal.prisma.ai_commerce_payment_gateways.findFirst({
    where: {
      id: paymentGatewayId,
      deleted_at: null,
    },
  });
  if (!gateway) {
    throw new Error("Payment gateway not found");
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_payment_gateways.update({
    where: { id: paymentGatewayId },
    data: {
      display_name: body.display_name ?? undefined,
      api_endpoint: body.api_endpoint ?? undefined,
      is_active: body.is_active ?? undefined,
      supported_currencies:
        body.supported_currencies !== undefined
          ? body.supported_currencies
          : undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    gateway_code: updated.gateway_code,
    display_name: updated.display_name,
    api_endpoint: updated.api_endpoint,
    is_active: updated.is_active,
    supported_currencies: updated.supported_currencies ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
