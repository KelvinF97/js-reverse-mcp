/**
 * Test setup — configures snapshot paths and serializers.
 * Required by the test runner via --require.
 */

import {snapshot} from 'node:test';
import {basename, dirname, join} from 'node:path';

snapshot.setResolveSnapshotPath((testFilePath: string | undefined) => {
  if (!testFilePath) return 'unknown.snapshot';
  return join(
    dirname(testFilePath),
    `${basename(testFilePath)}.snapshot`,
  );
});
