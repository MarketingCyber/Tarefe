// httpntlm ships without types; only the calls used by src/lib/dynamics/client.ts are declared.
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
    body?: string;
  };
  type Callback = (err: Error | null, res: { statusCode: number; body: string; headers: Record<string, string> } | undefined) => void;
  const httpntlm: {
    get(options: Options, callback: Callback): void;
    post(options: Options, callback: Callback): void;
    patch(options: Options, callback: Callback): void;
  };
  export default httpntlm;
}
