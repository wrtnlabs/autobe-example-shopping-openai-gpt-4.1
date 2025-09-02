import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new deposit ledger for a customer or seller account.
 *
 * This operation creates a new deposit ledger for a customer or seller in the
 * shopping mall backend system. Only one ledger is allowed per account holder
 * (customer or seller), enforced by a uniqueness check. All numerical balances
 * default to zero if omitted. Audit fields are all timestamped using the
 * current system time. Timestamps are normalized to string &
 * tags.Format<'date-time'>. Immutable, functional, and safe. Never uses native
 * Date or 'as' for type assertions.
 *
 * @param props - Request parameters.
 * @param props.admin - Authenticated admin user context (authorization enforced
 *   by controller).
 * @param props.body - Deposit creation information, including owner (customer
 *   or seller) and any initial balances or account metadata.
 * @returns The newly created deposit ledger with all audit/system fields
 *   populated.
 * @throws {Error} If neither customer_id nor seller_id is provided, or if a
 *   ledger already exists for the same account holder.
 */
export async function post__shoppingMallAiBackend_admin_deposits(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendDeposit.ICreate;
}): Promise<IShoppingMallAiBackendDeposit> {
  const { admin, body } = props;

  // 1. Validation: Must provide either customer or seller ID
  const customerId = body.shopping_mall_ai_backend_customer_id ?? null;
  const sellerId = body.shopping_mall_ai_backend_seller_id ?? null;
  if (!customerId && !sellerId) {
    throw new Error(
      "Either shopping_mall_ai_backend_customer_id or shopping_mall_ai_backend_seller_id must be provided to create a deposit ledger.",
    );
  }

  // 2. Uniqueness: Must not already exist for given account holder (with deleted_at == null)
  const orFilters = [] as {
    shopping_mall_ai_backend_customer_id?: string;
    shopping_mall_ai_backend_seller_id?: string;
    deleted_at: null;
  }[];
  if (customerId) {
    orFilters.push({
      shopping_mall_ai_backend_customer_id: customerId,
      deleted_at: null,
    });
  }
  if (sellerId) {
    orFilters.push({
      shopping_mall_ai_backend_seller_id: sellerId,
      deleted_at: null,
    });
  }
  if (orFilters.length > 0) {
    const existing =
      await MyGlobal.prisma.shopping_mall_ai_backend_deposits.findFirst({
        where: {
          OR: orFilters,
        },
      });
    if (existing) {
      throw new Error(
        "A deposit ledger already exists for this account holder (customer or seller). Duplicate ledgers are not allowed.",
      );
    }
  }
  // 3. Prepare insert fields - apply defaults immutably
  const now = toISOStringSafe(new Date());
  // Generate ID using v4()
  const id = v4();
  const deposit =
    await MyGlobal.prisma.shopping_mall_ai_backend_deposits.create({
      data: {
        id: id,
        shopping_mall_ai_backend_customer_id: customerId,
        shopping_mall_ai_backend_seller_id: sellerId,
        total_accrued: body.total_accrued ?? 0,
        usable_balance: body.usable_balance ?? 0,
        expired_balance: body.expired_balance ?? 0,
        on_hold_balance: body.on_hold_balance ?? 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // 4. Return DTO (all fields, dates as string & tags.Format<'date-time'>)
  return {
    id: deposit.id,
    shopping_mall_ai_backend_customer_id:
      deposit.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_seller_id:
      deposit.shopping_mall_ai_backend_seller_id,
    total_accrued: deposit.total_accrued,
    usable_balance: deposit.usable_balance,
    expired_balance: deposit.expired_balance,
    on_hold_balance: deposit.on_hold_balance,
    created_at: toISOStringSafe(deposit.created_at),
    updated_at: toISOStringSafe(deposit.updated_at),
    deleted_at:
      deposit.deleted_at !== undefined && deposit.deleted_at !== null
        ? toISOStringSafe(deposit.deleted_at)
        : null,
  };
}
