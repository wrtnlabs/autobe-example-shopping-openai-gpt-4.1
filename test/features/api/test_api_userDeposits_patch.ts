import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserDeposit";
import { IUserDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserDeposit";

export async function test_api_userDeposits_patch(connection: api.IConnection) {
  const output: IPageIUserDeposit = await api.functional.userDeposits.patch(
    connection,
    {
      body: typia.random<IUserDeposit.IRequest>(),
    },
  );
  typia.assert(output);
}
