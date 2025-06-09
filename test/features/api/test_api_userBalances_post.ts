import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserBalance } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserBalance";

export async function test_api_userBalances_post(connection: api.IConnection) {
  const output: IUserBalance = await api.functional.userBalances.post(
    connection,
    {
      body: typia.random<IUserBalance.ICreate>(),
    },
  );
  typia.assert(output);
}
