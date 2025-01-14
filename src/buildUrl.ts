import path from 'node:path';

import type { Arguments } from './arguments.js';
import { getRemoteUrl, getRootDirectory } from './helpers.js';
import { existsSync } from 'node:fs';

/**
 * Construct a GitHub folder/file view url based on the path
 */
export function buildUrl({
  remote,
  branch,
  file = './',
  line,
}: Arguments): string {
  if (remote === undefined)
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error('No remote is found in the repository');

  if (branch === undefined)
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error('No branches found in this repository');

  const baseUrl = resolveRemoteUrl(getRemoteUrl(remote));

  const rootDirectory = getRootDirectory();

  let resolvedPath = path.resolve(file);

  // If provided path is relative to root directory, resolve it correctly
  if (
    process.cwd() !== rootDirectory &&
    !existsSync(file) &&
    existsSync(path.join(rootDirectory, file))
  ) {
    resolvedPath = path.join(rootDirectory, file);
  }

  const lineNumber = line === undefined ? '' : `#L${line}`;

  const relativePath = path.relative(rootDirectory, resolvedPath);

  /*
   * If it's a directory, "tree" should be used instead of "blob", but GitHub
   * takes care of redirect so don't need to worry about that.
   *
   * However, GitHub does not redirect the base path
   */
  const mode = relativePath === '' ? 'tree' : 'blob';

  return [
    baseUrl,
    mode,
    '/',
    encodeURIComponent(branch),
    '/',
    relativePath.split('/').map(encodeURIComponent).join('/'),
    lineNumber,
  ].join('');
}

/** Remove ".git", add "/" and resolve SSH url */
function resolveRemoteUrl(rawUrl: string): string {
  const url = resolveSshUrl(rawUrl);
  const baseUrl = url.endsWith('.git') ? url.slice(0, -'.git'.length) : url;
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

const reSsh = /@(?<domain>[^:]+):(?<organization>[^/]+)\/(?<repository>.+)/u;

/**
 * Resolve SSH url to proper URL
 * @example
 * `git@github.example.com:organization/repository.git`
 */
function resolveSshUrl(url: string): string {
  const match = reSsh.exec(url)?.groups;
  if (match === undefined) return url;
  const { domain, organization, repository } = match;

  // Can't assume https as SSH urls could be used in enterprise
  return `http://${domain}/${organization}/${repository}`;
}
