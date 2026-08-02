export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string; // role name, e.g. ADMIN | USER
  departmentId: string;
  branchId: string;
}
