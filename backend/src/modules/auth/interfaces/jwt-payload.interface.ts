export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string; // role name, e.g. ADMIN | TEAM_LEADER | USER
  departmentId?: string | null;
  branchId?: string | null;
}
