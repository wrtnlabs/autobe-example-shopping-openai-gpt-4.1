import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICouponRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICouponRule";

export async function test_api_couponRules_post(connection: api.IConnection) {
  const output: ICouponRule = await api.functional.couponRules.post(
    connection,
    {
      body: typia.random<ICouponRule.ICreate>(),
    },
  );
  typia.assert(output);
}
