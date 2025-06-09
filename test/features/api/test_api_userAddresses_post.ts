import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserAddress";

export async function test_api_userAddresses_post(connection: api.IConnection) {
  const output: IUserAddress = await api.functional.userAddresses.post(
    connection,
    {
      body: typia.random<IUserAddress.ICreate>(),
    },
  );
  typia.assert(output);
}
