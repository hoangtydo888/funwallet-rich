import { useState } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Eye, Check, X, Image, Loader2, Search, FileText 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { KYCSubmission, useAdminKYC } from "@/hooks/useAdminKYC";

interface KYCTableProps {
  submissions: KYCSubmission[];
  onApprove: (id: string) => void;
  onReject: (params: { submissionId: string; reason: string }) => void;
  isApproving: boolean;
  isRejecting: boolean;
  getDocumentUrl: (path: string) => Promise<string | null>;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export function KYCTable({ 
  submissions, 
  onApprove, 
  onReject, 
  isApproving, 
  isRejecting,
  getDocumentUrl 
}: KYCTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.full_name.toLowerCase().includes(query) ||
      sub.id_number.toLowerCase().includes(query) ||
      sub.profile?.email?.toLowerCase().includes(query) ||
      sub.profile?.display_name?.toLowerCase().includes(query)
    );
  });

  const handleViewDocuments = async (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setLoadingDocs(true);
    setPreviewOpen(true);

    try {
      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        getDocumentUrl(submission.id_front_path),
        getDocumentUrl(submission.id_back_path),
        getDocumentUrl(submission.selfie_path),
      ]);

      setDocumentUrls({
        front: frontUrl || '',
        back: backUrl || '',
        selfie: selfieUrl || '',
      });
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleRejectClick = (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleConfirmReject = () => {
    if (selectedSubmission && rejectReason.trim()) {
      onReject({ submissionId: selectedSubmission.id, reason: rejectReason });
      setRejectOpen(false);
      setSelectedSubmission(null);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">Chưa có hồ sơ KYC nào</p>
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên, email, CMND..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>CMND/CCCD</TableHead>
              <TableHead>Ngày gửi</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{sub.profile?.display_name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{sub.profile?.email || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{sub.full_name}</TableCell>
                <TableCell className="font-mono text-sm">{sub.id_number}</TableCell>
                <TableCell className="text-sm">
                  {format(parseISO(sub.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[sub.status]}>
                    {statusLabels[sub.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDocuments(sub)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Xem
                    </Button>
                    {sub.status === 'pending' && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => onApprove(sub.id)}
                          disabled={isApproving}
                        >
                          {isApproving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Duyệt
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRejectClick(sub)}
                          disabled={isRejecting}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Từ chối
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem tài liệu KYC - {selectedSubmission?.full_name}</DialogTitle>
          </DialogHeader>
          
          {loadingDocs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Họ và tên</p>
                  <p className="font-medium">{selectedSubmission?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CMND/CCCD</p>
                  <p className="font-medium font-mono">{selectedSubmission?.id_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ngày sinh</p>
                  <p className="font-medium">{selectedSubmission?.date_of_birth || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quốc tịch</p>
                  <p className="font-medium">{selectedSubmission?.nationality || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số điện thoại</p>
                  <p className="font-medium">{selectedSubmission?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Địa chỉ</p>
                  <p className="font-medium">{selectedSubmission?.address || 'N/A'}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CMND mặt trước</Label>
                  {documentUrls.front ? (
                    <img 
                      src={documentUrls.front} 
                      alt="ID Front" 
                      className="w-full rounded-lg border border-border object-cover aspect-video"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>CMND mặt sau</Label>
                  {documentUrls.back ? (
                    <img 
                      src={documentUrls.back} 
                      alt="ID Back" 
                      className="w-full rounded-lg border border-border object-cover aspect-video"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Ảnh selfie</Label>
                  {documentUrls.selfie ? (
                    <img 
                      src={documentUrls.selfie} 
                      alt="Selfie" 
                      className="w-full rounded-lg border border-border object-cover aspect-video"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection reason if rejected */}
              {selectedSubmission?.status === 'rejected' && selectedSubmission.rejection_reason && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive">Lý do từ chối:</p>
                  <p className="text-sm mt-1">{selectedSubmission.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối hồ sơ KYC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bạn đang từ chối hồ sơ của <strong>{selectedSubmission?.full_name}</strong>.
              Vui lòng nhập lý do từ chối.
            </p>
            <div className="space-y-2">
              <Label>Lý do từ chối</Label>
              <Textarea
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim() || isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
