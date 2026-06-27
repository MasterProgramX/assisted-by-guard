import { readFile } from "node:fs/promises";
import { shouldRequireSpdx, type CommitRecord, type LocalPrInput, type NewFileRecord } from "@assisted-by-guard/core";

export interface FetchHeaders {
  get(name: string): string | null;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: FetchHeaders;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchFunction = (url: string, init: { headers: Record<string, string> }) => Promise<FetchResponse>;

export interface PullRequestCollectionOptions {
  token: string;
  eventPath: string | undefined;
  repository: string | undefined;
  apiUrl: string | undefined;
  fetcher: FetchFunction;
  includeNewFileContents: boolean;
}

export interface PullRequestContext {
  owner: string;
  repo: string;
  number: number;
  headOwner: string;
  headRepo: string;
  headSha: string;
}

interface PullRequestFile {
  filename: string;
  status: string;
}

export async function collectPullRequestEventInput(options: PullRequestCollectionOptions): Promise<LocalPrInput> {
  if (!options.eventPath) {
    throw new Error(
      "Expected explicit local input or a GitHub pull_request event. Provide pr-json, commits-json, or new-files-json, or run on pull_request."
    );
  }

  if (!options.token) {
    throw new Error("GitHub pull_request collection requires github-token with read-only repository permissions.");
  }

  const event = await readEventJson(options.eventPath);
  const context = pullRequestContextFromEvent(event, options.repository);
  const client = new GitHubRestClient({
    apiUrl: options.apiUrl ?? "https://api.github.com",
    token: options.token,
    fetcher: options.fetcher
  });
  const commits = await collectPullRequestCommits(client, context);
  const newFiles = options.includeNewFileContents ? await collectAddedSourceFiles(client, context) : [];

  return { commits, newFiles };
}

export async function collectPullRequestCommits(client: GitHubRestClient, context: PullRequestContext): Promise<CommitRecord[]> {
  const values = await client.getPaginated(`/repos/${encodeSegment(context.owner)}/${encodeSegment(context.repo)}/pulls/${context.number}/commits`);

  return values.map((value) => {
    if (!isRecord(value) || typeof value.sha !== "string" || !isRecord(value.commit) || typeof value.commit.message !== "string") {
      throw new Error("GitHub API returned an unexpected pull request commit shape.");
    }

    return {
      sha: value.sha,
      message: value.commit.message
    };
  });
}

export async function collectAddedSourceFiles(client: GitHubRestClient, context: PullRequestContext): Promise<NewFileRecord[]> {
  const values = await client.getPaginated(`/repos/${encodeSegment(context.owner)}/${encodeSegment(context.repo)}/pulls/${context.number}/files`);
  const files = values.map(toPullRequestFile).filter((file) => file.status === "added" && shouldRequireSpdx(file.filename));

  return Promise.all(files.map((file) => readRepositoryFile(client, context, file.filename)));
}

export function pullRequestContextFromEvent(event: unknown, repository: string | undefined): PullRequestContext {
  if (!isRecord(event) || !isRecord(event.pull_request)) {
    throw new Error("GitHub event is not a pull_request event. Provide explicit local input or run on pull_request.");
  }

  const pullRequest = event.pull_request;
  const repoFullName = readStringPath(event, ["repository", "full_name"]) ?? repository;
  const [owner, repo] = splitRepositoryName(repoFullName);
  const headFullName = readStringPath(pullRequest, ["head", "repo", "full_name"]) ?? repoFullName;
  const [headOwner, headRepo] = splitRepositoryName(headFullName);
  const number = typeof pullRequest.number === "number" ? pullRequest.number : undefined;
  const headSha = readStringPath(pullRequest, ["head", "sha"]);

  if (!number) {
    throw new Error("GitHub pull_request event is missing pull_request.number.");
  }

  if (!headSha) {
    throw new Error("GitHub pull_request event is missing pull_request.head.sha.");
  }

  return { owner, repo, number, headOwner, headRepo, headSha };
}

export function parseNextLink(linkHeader: string | null): string | undefined {
  if (!linkHeader) {
    return undefined;
  }

  for (const part of linkHeader.split(",")) {
    const match = part.trim().match(/^<([^>]+)>;\s*rel="([^"]+)"$/);
    if (match?.[2] === "next") {
      return match[1];
    }
  }

  return undefined;
}

export class GitHubRestClient {
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly fetcher: FetchFunction;

  constructor(options: { apiUrl: string; token: string; fetcher: FetchFunction }) {
    this.apiUrl = options.apiUrl;
    this.token = options.token;
    this.fetcher = options.fetcher;
  }

  async getPaginated(path: string): Promise<unknown[]> {
    const items: unknown[] = [];
    let nextUrl: string | undefined = this.absoluteUrl(withPerPage(path));

    while (nextUrl) {
      const response = await this.request(nextUrl);
      const body = await response.json();

      if (!Array.isArray(body)) {
        throw new Error("GitHub API returned an unexpected paginated response shape.");
      }

      items.push(...body);
      nextUrl = parseNextLink(response.headers.get("link"));
    }

    return items;
  }

  async getJson(path: string): Promise<unknown> {
    return (await this.request(this.absoluteUrl(path))).json();
  }

  private async request(url: string): Promise<FetchResponse> {
    const response = await this.fetcher(url, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${this.token}`,
        "user-agent": "assisted-by-guard",
        "x-github-api-version": "2022-11-28"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed (${response.status} ${response.statusText}) for ${displayUrl(url)}${await errorSuffix(response)}`);
    }

    return response;
  }

  private absoluteUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const base = this.apiUrl.endsWith("/") ? this.apiUrl : `${this.apiUrl}/`;
    return new URL(path.replace(/^\//, ""), base).toString();
  }
}

async function readEventJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("GitHub event file is not valid JSON.");
    }

    throw error;
  }
}

async function readRepositoryFile(client: GitHubRestClient, context: PullRequestContext, path: string): Promise<NewFileRecord> {
  const value = await client.getJson(
    `/repos/${encodeSegment(context.headOwner)}/${encodeSegment(context.headRepo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(context.headSha)}`
  );

  if (!isRecord(value) || typeof value.content !== "string" || value.encoding !== "base64") {
    throw new Error(`GitHub API returned an unexpected content response for ${path}.`);
  }

  return {
    path,
    content: Buffer.from(value.content.replace(/\s/g, ""), "base64").toString("utf8")
  };
}

function toPullRequestFile(value: unknown): PullRequestFile {
  if (!isRecord(value) || typeof value.filename !== "string" || typeof value.status !== "string") {
    throw new Error("GitHub API returned an unexpected pull request file shape.");
  }

  return {
    filename: value.filename,
    status: value.status
  };
}

function splitRepositoryName(fullName: string | undefined): [owner: string, repo: string] {
  const parts = fullName?.split("/") ?? [];

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("GitHub pull_request context is missing repository owner/name.");
  }

  return [parts[0], parts[1]];
}

function readStringPath(value: unknown, path: string[]): string | undefined {
  let current = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function withPerPage(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}per_page=100`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function errorSuffix(response: FetchResponse): Promise<string> {
  const body = (await response.text()).trim();
  return body ? `: ${body.slice(0, 240)}` : "";
}

function displayUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}
