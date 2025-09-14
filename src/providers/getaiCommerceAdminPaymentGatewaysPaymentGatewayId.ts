import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific payment gateway by paymentGatewayId
 * (admin-only).
 *
 * This endpoint allows an administrator to fetch the complete configuration and
 * metadata of a payment gateway, including gateway code, display name, API
 * endpoint, status, supported currencies, and all timestamps. Only
 * administrators with valid credentials can access this sensitive configuration
 * data. Access errors are thrown automatically if the payment gateway does not
 * exist or if the admin account is invalidated. All datetime values are
 * formatted as ISO 8601 strings, and null/optional fields are handled per API
 * contract. This function is read-only and intended for secure platform
 * management UIs.
 *
 * @param props - The operation input.
 * @param props.admin - The authenticated admin making the request.
 * @param props.paymentGatewayId - The UUID of the ai_commerce_payment_gateways
 *   row to retrieve.
 * @returns Full payment gateway details and configuration fields for platform
 *   integration.
 * @throws {Error} If the payment gateway does not exist, or the admin loses
 *   access during request. Prisma will throw.
 */
export async function getaiCommerceAdminPaymentGatewaysPaymentGatewayId(props: {
  admin: AdminPayload;
  paymentGatewayId: string & tags.Format<"uuid">;
}): Promise<IAiCommercePaymentGateway> {
  const { admin, paymentGatewayId } = props;
  const gateway =
    await MyGlobal.prisma.ai_commerce_payment_gateways.findUniqueOrThrow({
      where: { id: paymentGatewayId },
    });
  return {
    id: gateway.id,
    gateway_code: gateway.gateway_code,
    display_name: gateway.display_name,
    api_endpoint: gateway.api_endpoint,
    is_active: gateway.is_active,
    supported_currencies: gateway.supported_currencies ?? undefined,
    created_at: toISOStringSafe(gateway.created_at),
    updated_at: toISOStringSafe(gateway.updated_at),
    deleted_at:
      gateway.deleted_at !== null && gateway.deleted_at !== undefined
        ? toISOStringSafe(gateway.deleted_at)
        : undefined,
  };
}
