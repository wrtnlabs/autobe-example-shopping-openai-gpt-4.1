import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserBalance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserBalance";
import { IUserBalance } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserBalance";

export async function test_api_userBalances_patch(connection: api.IConnection) {
  const output: IPageIUserBalance = await api.functional.userBalances.patch(
    connection,
    {
      body: typia.random<IUserBalance.IRequest>(),
    },
  );
  typia.assert(output);
}
