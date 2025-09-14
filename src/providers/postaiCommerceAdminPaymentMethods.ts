import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new payment method in the ai_commerce_payment_methods table.
 *
 * This operation registers a new payment method on the platform, available only
 * to admin users. The method_code must be unique; if a duplicate is detected,
 * an error is thrown and no method is created. Fields such as display_name and
 * (optionally) configuration are persisted as provided. The is_active field
 * defaults to true unless explicitly set in the request body. All
 * date/timestamps are stored and returned as ISO 8601 strings (branded as
 * date-time). Upon success, the newly created payment method is returned in
 * full detail.
 *
 * @param props - Function props containing the admin authentication payload and
 *   payment method creation body.
 * @param props.admin - Authenticated admin payload (authorization required).
 * @param props.body - New payment method creation details (method code, display
 *   name, optional config).
 * @returns The created IAiCommercePaymentMethod entity with all schema
 *   properties populated.
 * @throws {Error} If the provided method_code is not unique or any database
 *   error occurs.
 */
export async function postaiCommerceAdminPaymentMethods(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentMethod.ICreate;
}): Promise<IAiCommercePaymentMethod> {
  // 1. Enforce method_code uniqueness.
  const existing = await MyGlobal.prisma.ai_commerce_payment_methods.findFirst({
    where: { method_code: props.body.method_code },
  });
  if (existing !== null) {
    throw new Error("Duplicate method_code");
  }

  // 2. Prepare immutable values.
  const now = toISOStringSafe(new Date());
  const uuid = v4();

  // 3. Create new payment method atomically.
  const record = await MyGlobal.prisma.ai_commerce_payment_methods.create({
    data: {
      id: uuid,
      method_code: props.body.method_code,
      display_name: props.body.display_name,
      is_active:
        props.body.is_active !== undefined ? props.body.is_active : true,
      configuration: props.body.configuration ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Return mapped output, transforming all date and nullable fields appropriately.
  return {
    id: record.id,
    method_code: record.method_code,
    display_name: record.display_name,
    is_active: record.is_active,
    configuration: record.configuration ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== undefined && record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : null,
  };
}
