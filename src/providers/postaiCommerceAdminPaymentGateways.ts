import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new payment gateway configuration (admin only) in
 * ai_commerce_payment_gateways.
 *
 * This operation allows an administrator to register a new payment gateway for
 * the platform, including gateway code, display name, endpoint URL, active
 * status, and supported currencies. The gateway_code and display_name must be
 * unique. Audit logs are maintained externally. Only admins can invoke this
 * operation.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the action
 * @param props.body - The payment gateway creation information
 * @returns The full configuration of the newly created payment gateway
 * @throws {Error} If the gateway_code or display_name already exists
 * @throws {Error} On internal Prisma or validation failures
 */
export async function postaiCommerceAdminPaymentGateways(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentGateway.ICreate;
}): Promise<IAiCommercePaymentGateway> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.ai_commerce_payment_gateways.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        gateway_code: props.body.gateway_code,
        display_name: props.body.display_name,
        api_endpoint: props.body.api_endpoint,
        is_active: props.body.is_active,
        supported_currencies:
          props.body.supported_currencies !== undefined
            ? props.body.supported_currencies
            : undefined,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      gateway_code: created.gateway_code,
      display_name: created.display_name,
      api_endpoint: created.api_endpoint,
      is_active: created.is_active,
      supported_currencies: created.supported_currencies ?? undefined,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null && created.deleted_at !== undefined
          ? toISOStringSafe(created.deleted_at)
          : undefined,
    };
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err) {
      if ((err as { code: string }).code === "P2002") {
        throw new Error("gateway_code or display_name already exists");
      }
    }
    throw err;
  }
}
