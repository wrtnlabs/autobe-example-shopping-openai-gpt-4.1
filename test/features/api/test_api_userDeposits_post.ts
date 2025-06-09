import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserDeposit";

export async function test_api_userDeposits_post(connection: api.IConnection) {
  const output: IUserDeposit = await api.functional.userDeposits.post(
    connection,
    {
      body: typia.random<IUserDeposit.ICreate>(),
    },
  );
  typia.assert(output);
}
