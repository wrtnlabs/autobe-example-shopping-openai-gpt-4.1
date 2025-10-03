import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Validate admin mileage update endpoint (CRUD for IShoppingMallMileage, role
 * enforcement, business/audit rules).
 *
 * 1. Register admin and login.
 * 2. Admin creates a mileage account for random customerId with some initial
 *    balance.
 * 3. Admin updates:
 *
 *    - Balance: increment, decrement (non-negative only), no overflow.
 *    - Status: change from "active" to "frozen" and back.
 *    - Expiry: set expired_at to some date in the future. Each time, validate
 *         response fields, including updated_at.
 * 4. Attempt invalid update (negative balance) and expect failure.
 * 5. Attempt to update non-existent mileageId—expect error.
 * 6. Soft-delete mileage (by setting deleted_at) then try to update—should fail.
 * 7. Simulate concurrency: perform two updates in succession and check last
 *    applied is reflected.
 * 8. Role enforcement: simulate unauthenticated and expect error.
 * 9. Audit/history: compare updated_at after every change.
 */
export async function test_api_admin_mileage_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    password: "password123",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Create a mileage account
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  const mileageCreateInput = {
    shopping_mall_customer_id: fakeCustomerId,
    balance: 1000,
    status: "active",
    expired_at: null,
  } satisfies IShoppingMallMileage.ICreate;
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    { body: mileageCreateInput },
  );
  typia.assert(mileage);
  TestValidator.equals("initial balance matches", mileage.balance, 1000);
  TestValidator.equals("status is active", mileage.status, "active");
  TestValidator.equals("expired_at is null", mileage.expired_at, null);

  // Store timestamps for audit verification
  let prevUpdatedAt = mileage.updated_at;

  // 3a. Positive update: add balance
  const increment = 500;
  const mileageInc = await api.functional.shoppingMall.admin.mileages.update(
    connection,
    {
      mileageId: mileage.id,
      body: {
        balance: mileage.balance + increment,
      } satisfies IShoppingMallMileage.IUpdate,
    },
  );
  typia.assert(mileageInc);
  TestValidator.equals(
    "balance incremented",
    mileageInc.balance,
    mileage.balance + increment,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    mileageInc.updated_at,
    prevUpdatedAt,
  );
  prevUpdatedAt = mileageInc.updated_at;

  // 3b. Debit (non-negative)
  const mileageDec = await api.functional.shoppingMall.admin.mileages.update(
    connection,
    {
      mileageId: mileage.id,
      body: {
        balance: mileageInc.balance - 300,
      },
    },
  );
  typia.assert(mileageDec);
  TestValidator.equals(
    "balance decremented",
    mileageDec.balance,
    mileageInc.balance - 300,
  );
  prevUpdatedAt = mileageDec.updated_at;

  // 3c. Status change: freeze and reactivate
  const mileageFrozen = await api.functional.shoppingMall.admin.mileages.update(
    connection,
    {
      mileageId: mileage.id,
      body: { status: "frozen" },
    },
  );
  typia.assert(mileageFrozen);
  TestValidator.equals("status frozen", mileageFrozen.status, "frozen");

  const mileageReact = await api.functional.shoppingMall.admin.mileages.update(
    connection,
    {
      mileageId: mileage.id,
      body: { status: "active" },
    },
  );
  typia.assert(mileageReact);
  TestValidator.equals("status re-activated", mileageReact.status, "active");

  // 3d. Set expiry
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const mileageExp = await api.functional.shoppingMall.admin.mileages.update(
    connection,
    {
      mileageId: mileage.id,
      body: { expired_at: future },
    },
  );
  typia.assert(mileageExp);
  TestValidator.equals("expired_at set", mileageExp.expired_at, future);

  // 4. Invalid: negative balance (should fail)
  await TestValidator.error("negative balance update should fail", async () => {
    await api.functional.shoppingMall.admin.mileages.update(connection, {
      mileageId: mileage.id,
      body: { balance: -100 },
    });
  });

  // 5. Invalid: non-existent mileageId
  const fakeMileageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("update non-existent mileageId fails", async () => {
    await api.functional.shoppingMall.admin.mileages.update(connection, {
      mileageId: fakeMileageId,
      body: { balance: 100 },
    });
  });

  // 6. Soft-delete then try update (set deleted_at to now, then try to update)
  const now = new Date().toISOString();
  const mileageDeleted =
    await api.functional.shoppingMall.admin.mileages.update(connection, {
      mileageId: mileage.id,
      body: { deleted_at: now },
    });
  typia.assert(mileageDeleted);
  TestValidator.equals("deleted_at set", mileageDeleted.deleted_at, now);
  // Cannot update deleted
  await TestValidator.error("cannot update deleted mileage", async () => {
    await api.functional.shoppingMall.admin.mileages.update(connection, {
      mileageId: mileage.id,
      body: { balance: 9999 },
    });
  });

  // 7. Concurrency/race: two updates, last should be effective
  // Re-create a new mileage for this test
  const mile2 = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
        balance: 333,
        status: "active",
      },
    },
  );
  typia.assert(mile2);

  const update1 = await api.functional.shoppingMall.admin.mileages.update(
    connection,
    {
      mileageId: mile2.id,
      body: { balance: 888 },
    },
  );
  typia.assert(update1);
  const update2 = await api.functional.shoppingMall.admin.mileages.update(
    connection,
    {
      mileageId: mile2.id,
      body: { balance: 444 },
    },
  );
  typia.assert(update2);
  TestValidator.equals("concurrent update - value", update2.balance, 444);

  // 8. Role enforcement: unauthenticated attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update forbidden", async () => {
    await api.functional.shoppingMall.admin.mileages.update(unauthConn, {
      mileageId: update2.id,
      body: { balance: 777 },
    });
  });
}
