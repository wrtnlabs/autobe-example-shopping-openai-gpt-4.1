import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new mileage (rewards points) ledger for a specified customer.
 *
 * This operation allows an authenticated customer to create a unique mileage
 * ledger (reward points account). Only the customer themselves can create their
 * own ledger; creation for other customers is prohibited. The function enforces
 * uniqueness (one active ledger per customer), returning an error if one
 * already exists. All audit fields (created_at, updated_at) are populated, and
 * only active ledgers are returned.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer making the request. Only this
 *   customer can create their mileage ledger.
 * @param props.body - Ledger creation data, including initial balance fields.
 * @returns Newly created mileage ledger object containing all balances and
 *   audit fields.
 * @throws {Error} If a ledger for this customer already exists and is active
 *   (not soft-deleted), or if the customer attempts to create a ledger for
 *   another account.
 */
export async function post__shoppingMallAiBackend_customer_mileages(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendMileage.ICreate;
}): Promise<IShoppingMallAiBackendMileage> {
  const { customer, body } = props;

  // Authorization: Only allow customer to create their own mileage ledger
  if ((body.shopping_mall_ai_backend_customer_id ?? null) !== customer.id) {
    throw new Error(
      "Unauthorized: Customers can only create their own mileage ledger",
    );
  }

  // Uniqueness: Customers can only have one active (non-deleted) ledger
  const exists =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileages.findFirst({
      where: {
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new Error("Mileage ledger already exists for this customer");
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileages.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_customer_id: customer.id,
        shopping_mall_ai_backend_seller_id: null,
        total_accrued: body.total_accrued,
        usable_mileage: body.usable_mileage,
        expired_mileage: body.expired_mileage,
        on_hold_mileage: body.on_hold_mileage,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_seller_id:
      created.shopping_mall_ai_backend_seller_id,
    total_accrued: created.total_accrued,
    usable_mileage: created.usable_mileage,
    expired_mileage: created.expired_mileage,
    on_hold_mileage: created.on_hold_mileage,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
