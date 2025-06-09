import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICouponRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICouponRule";
import { ICouponRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICouponRule";

export async function test_api_couponRules_patch(connection: api.IConnection) {
  const output: IPageICouponRule = await api.functional.couponRules.patch(
    connection,
    {
      body: typia.random<ICouponRule.IRequest>(),
    },
  );
  typia.assert(output);
}
