import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { StaffAccountPort } from "../application/staff-account.port";
import { Pool } from "pg";

@Injectable()
export class HttpStaffAccount implements StaffAccountPort {
  private authPool = new Pool({
    host: "localhost",
    port: 5432,
    user: "car_user",
    password: "car_password",
    database: "auth_db",
    max: 3,
  });

  async isActive(userId: string): Promise<boolean> {
    return (await this.status(userId))?.isAllowed === true;
  }

  async isApprovedVendor(userId: string): Promise<boolean> {
    const account = await this.status(userId);
    return (
      account?.isAllowed === true &&
      account.ticketVendorApprovalStatus === "APPROVED"
    );
  }

    async grantStaffRole(userId: string): Promise<void> {
    try {
      await this.authPool.query(
        "INSERT INTO users_roles(user_id, roles_name) VALUES ($1, 'STAFF') ON CONFLICT DO NOTHING",
        [userId],
      );
    } catch (err) {
      console.error("Failed to grant STAFF role:", err);
    }
  }

  async lookup(query: string): Promise<{
    id: string;
    username: string;
    email: string;
    fullName?: string;
    phoneNumber?: string;
  } | null> {
    const clean = query?.trim();
    if (!clean) return null;
    try {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          clean
        );
      const res = await this.authPool.query(
        `SELECT u.id, u.username, u.email, p.full_name, p.phone_number
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE ($1::boolean AND u.id::text = $2)
            OR lower(u.email) = lower($2)
            OR lower(u.username) = lower($2)
            OR p.phone_number = $2
            OR lower(u.email) LIKE lower($3)
            OR lower(u.username) LIKE lower($3)
            OR lower(p.full_name) LIKE lower($3)
         LIMIT 1`,
        [isUuid, clean, `%${clean}%`]
      );
      if (!res.rows || res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name || undefined,
        phoneNumber: row.phone_number || undefined,
      };
    } catch {
      return null;
    }
  }

  private async status(
    userId: string
  ): Promise<
    { isAllowed?: boolean; ticketVendorApprovalStatus?: string } | undefined
  > {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token)
      throw new ServiceUnavailableException("Chưa cấu hình xác thực nội bộ");
    try {
      const base = process.env.IDENTITY_INTERNAL_URL || "http://127.0.0.1:8080";
      const response = await fetch(
        base + "/api/users/internal/" + encodeURIComponent(userId) + "/status",
        {
          headers: { "x-internal-service-token": token },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) throw new Error("Identity unavailable");
      const body = (await response.json()) as {
        data?: { isAllowed?: boolean; ticketVendorApprovalStatus?: string };
      };
      return body.data;
    } catch {
      throw new ServiceUnavailableException(
        "Không kiểm tra được nhân viên với Identity"
      );
    }
  }
}
