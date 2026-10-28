export type OperatorApplicationStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface OperatorApplicationProps {
  id: string;
  userId: string;
  name: string;
  logoUrl?: string;
  phone: string;
  address: string;
  representativeName?: string;
  representativeIdNumber?: string;
  taxCode?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  status: OperatorApplicationStatus;
  rejectReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class OperatorApplicationEntity {
  public readonly id: string;
  public readonly userId: string;
  public readonly name: string;
  public readonly logoUrl?: string;
  public readonly phone: string;
  public readonly address: string;
  public readonly representativeName?: string;
  public readonly representativeIdNumber?: string;
  public readonly taxCode?: string;
  public readonly documentFrontUrl?: string;
  public readonly documentBackUrl?: string;
  public readonly status: OperatorApplicationStatus;
  public readonly rejectReason?: string | null;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(props: OperatorApplicationProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name;
    this.logoUrl = props.logoUrl;
    this.phone = props.phone;
    this.address = props.address;
    this.representativeName = props.representativeName;
    this.representativeIdNumber = props.representativeIdNumber;
    this.taxCode = props.taxCode;
    this.documentFrontUrl = props.documentFrontUrl;
    this.documentBackUrl = props.documentBackUrl;
    this.status = props.status;
    this.rejectReason = props.rejectReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public isPending(): boolean {
    return this.status === "PENDING";
  }

  public isApproved(): boolean {
    return this.status === "APPROVED";
  }

  public isRejected(): boolean {
    return this.status === "REJECTED";
  }

  public canBeProcessed(): boolean {
    return this.status === "PENDING";
  }

  public getFormattedCreatedAt(): string {
    if (!this.createdAt) return "";
    try {
      const date = new Date(this.createdAt);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return this.createdAt;
    }
  }

  public getFormattedUpdatedAt(): string {
    if (!this.updatedAt) return "";
    try {
      const date = new Date(this.updatedAt);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return this.updatedAt;
    }
  }

  public getStatusBadgeInfo(): {
    label: string;
    variantClass: string;
    borderClass: string;
  } {
    switch (this.status) {
      case "PENDING":
        return {
          label: "Chờ xét duyệt",
          variantClass: "bg-amber-50 text-amber-700",
          borderClass: "border-amber-200",
        };
      case "APPROVED":
        return {
          label: "Đã phê duyệt",
          variantClass: "bg-green-50 text-green-700",
          borderClass: "border-green-200",
        };
      case "REJECTED":
        return {
          label: "Đã từ chối",
          variantClass: "bg-red-50 text-red-700",
          borderClass: "border-red-200",
        };
      case "CANCELLED":
        return {
          label: "Đã hủy",
          variantClass: "bg-gray-100 text-gray-700",
          borderClass: "border-gray-200",
        };
      default:
        return {
          label: this.status,
          variantClass: "bg-gray-100 text-gray-700",
          borderClass: "border-gray-200",
        };
    }
  }

  public static fromApiResponse(raw: any): OperatorApplicationEntity {
    if (!raw) {
      throw new Error("Dữ liệu đơn đăng ký nhà xe không hợp lệ");
    }

    return new OperatorApplicationEntity({
      id: raw.id || "",
      userId: raw.userId || raw.user_id || "",
      name: raw.name || "",
      logoUrl: raw.logoUrl,
      phone: raw.phone || "",
      address: raw.address || "",
      representativeName: raw.representativeName,
      representativeIdNumber: raw.representativeIdNumber,
      taxCode: raw.taxCode,
      documentFrontUrl: raw.documentFrontUrl,
      documentBackUrl: raw.documentBackUrl,
      status: (raw.status || "PENDING") as OperatorApplicationStatus,
      rejectReason: raw.rejectReason || raw.reject_reason || null,
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    });
  }
}
