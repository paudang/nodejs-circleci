export class User {
  constructor(
    public id: number | string | null,
    public name: string,
    public email: string,
    public password?: string | null,
    public googleId?: string | null,
    public githubId?: string | null,
  ) {}
}
