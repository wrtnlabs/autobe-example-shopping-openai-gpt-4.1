import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserAddress";
import { IUserAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserAddress";

export async function test_api_userAddresses_patch(
  connection: api.IConnection,
) {
  const output: IPageIUserAddress = await api.functional.userAddresses.patch(
    connection,
    {
      body: typia.random<IUserAddress.IRequest>(),
    },
  );
  typia.assert(output);
}
