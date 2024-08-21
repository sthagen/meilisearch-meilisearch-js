import { ErrorStatusCode } from "../src/types";
import {
  clearAllIndexes,
  config,
  BAD_HOST,
  MeiliSearch,
  getClient,
  dataset,
} from "./utils/meilisearch-test-utils";

const index = {
  uid: "movies_test",
};

jest.setTimeout(100 * 1000);

afterAll(() => {
  return clearAllIndexes(config);
});

describe.each([{ permission: "Master" }, { permission: "Admin" }])(
  "Test on sortable attributes",
  ({ permission }) => {
    beforeEach(async () => {
      const client = await getClient("Master");
      const { taskUid } = await client.createIndex(index.uid);
      await client.waitForTask(taskUid);

      const { taskUid: docTask } = await client
        .index(index.uid)
        .addDocuments(dataset);
      await client.waitForTask(docTask);
    });

    test(`${permission} key: Get default sortable attributes`, async () => {
      const client = await getClient(permission);

      const response = await client.index(index.uid).getSortableAttributes();

      expect(response).toEqual([]);
    });

    test(`${permission} key: Update sortable attributes`, async () => {
      const client = await getClient(permission);
      const newSortableAttributes = ["title"];
      const task = await client
        .index(index.uid)
        .updateSortableAttributes(newSortableAttributes);
      await client.index(index.uid).waitForTask(task.taskUid);

      const response = await client.index(index.uid).getSortableAttributes();
      expect(response).toEqual(newSortableAttributes);
    });

    test(`${permission} key: Update sortable attributes at null`, async () => {
      const client = await getClient(permission);
      const task = await client.index(index.uid).updateSortableAttributes(null);
      await client.index(index.uid).waitForTask(task.taskUid);

      const response = await client.index(index.uid).getSortableAttributes();

      expect(response).toEqual([]);
    });

    test(`${permission} key: Reset sortable attributes`, async () => {
      const client = await getClient(permission);
      const task = await client.index(index.uid).resetSortableAttributes();
      await client.index(index.uid).waitForTask(task.taskUid);

      const response = await client.index(index.uid).getSortableAttributes();

      expect(response).toEqual([]);
    });
  },
);

describe.each([{ permission: "Search" }])(
  "Test on sortable attributes",
  ({ permission }) => {
    beforeEach(async () => {
      const client = await getClient("Master");
      const { taskUid } = await client.createIndex(index.uid);
      await client.waitForTask(taskUid);
    });

    test(`${permission} key: try to get sortable attributes and be denied`, async () => {
      const client = await getClient(permission);
      await expect(
        client.index(index.uid).getSortableAttributes(),
      ).rejects.toHaveProperty("cause.code", ErrorStatusCode.INVALID_API_KEY);
    });

    test(`${permission} key: try to update sortable attributes and be denied`, async () => {
      const client = await getClient(permission);
      await expect(
        client.index(index.uid).updateSortableAttributes([]),
      ).rejects.toHaveProperty("cause.code", ErrorStatusCode.INVALID_API_KEY);
    });

    test(`${permission} key: try to reset sortable attributes and be denied`, async () => {
      const client = await getClient(permission);
      await expect(
        client.index(index.uid).resetSortableAttributes(),
      ).rejects.toHaveProperty("cause.code", ErrorStatusCode.INVALID_API_KEY);
    });
  },
);

describe.each([{ permission: "No" }])(
  "Test on sortable attributes",
  ({ permission }) => {
    beforeAll(async () => {
      const client = await getClient("Master");
      const { taskUid } = await client.createIndex(index.uid);
      await client.waitForTask(taskUid);
    });

    test(`${permission} key: try to get sortable attributes and be denied`, async () => {
      const client = await getClient(permission);
      await expect(
        client.index(index.uid).getSortableAttributes(),
      ).rejects.toHaveProperty(
        "cause.code",
        ErrorStatusCode.MISSING_AUTHORIZATION_HEADER,
      );
    });

    test(`${permission} key: try to update sortable attributes and be denied`, async () => {
      const client = await getClient(permission);
      const resetSortable: string[] = [];
      await expect(
        client.index(index.uid).updateSortableAttributes(resetSortable),
      ).rejects.toHaveProperty(
        "cause.code",
        ErrorStatusCode.MISSING_AUTHORIZATION_HEADER,
      );
    });

    test(`${permission} key: try to reset sortable attributes and be denied`, async () => {
      const client = await getClient(permission);
      await expect(
        client.index(index.uid).resetSortableAttributes(),
      ).rejects.toHaveProperty(
        "cause.code",
        ErrorStatusCode.MISSING_AUTHORIZATION_HEADER,
      );
    });
  },
);

describe.each([
  { host: BAD_HOST, trailing: false },
  { host: `${BAD_HOST}/api`, trailing: false },
  { host: `${BAD_HOST}/trailing/`, trailing: true },
])("Tests on url construction", ({ host, trailing }) => {
  test(`Test getSortableAttributes route`, async () => {
    const route = `indexes/${index.uid}/settings/sortable-attributes`;
    const client = new MeiliSearch({ host });
    const strippedHost = trailing ? host.slice(0, -1) : host;
    await expect(
      client.index(index.uid).getSortableAttributes(),
    ).rejects.toHaveProperty(
      "message",
      `Request to ${strippedHost}/${route} has failed`,
    );
  });

  test(`Test updateSortableAttributes route`, async () => {
    const route = `indexes/${index.uid}/settings/sortable-attributes`;
    const client = new MeiliSearch({ host });
    const strippedHost = trailing ? host.slice(0, -1) : host;
    await expect(
      client.index(index.uid).updateSortableAttributes([]),
    ).rejects.toHaveProperty(
      "message",
      `Request to ${strippedHost}/${route} has failed`,
    );
  });

  test(`Test resetSortableAttributes route`, async () => {
    const route = `indexes/${index.uid}/settings/sortable-attributes`;
    const client = new MeiliSearch({ host });
    const strippedHost = trailing ? host.slice(0, -1) : host;
    await expect(
      client.index(index.uid).resetSortableAttributes(),
    ).rejects.toHaveProperty(
      "message",
      `Request to ${strippedHost}/${route} has failed`,
    );
  });
});
