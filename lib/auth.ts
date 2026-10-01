/** Vai trò trong CRM: quản lý thấy mọi nick, nhân viên chỉ thấy nick mình cầm. */
export type VaiTro = "quan-ly" | "nhan-vien";

export function laQuanLy(vaiTro?: string | null): boolean {
  return vaiTro === "quan-ly";
}
