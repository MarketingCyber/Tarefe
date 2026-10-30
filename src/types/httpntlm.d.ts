// httpntlm ships without types; only the GET call used by src/lib/dynamics/client.ts is declared.
declare module "httpntlm" {
  type Options = {
    url: string;
    username: string;
    password: string;
    domain?: string;
    workstation?: string;
    ntlm_version?: 1 | 2;
    timeout?: number;
    headers?: Record<string, string>;
  };
  type Callback = (err: Error | null, res: { statusCode: number; body: string; headers: Record<string, string> } | undefined) => void;
  const httpntlm: { get(options: Options, callback: Callback): void };
  export default httpntlm;
}
