"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown-menu";
import {
  Eye,
  Send,
  Download,
  Briefcase,
  Receipt,
  Copy,
  Bookmark,
  Trash2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { CloudExportButton } from "@/components/cloud/cloud-export-button";
import { type QuoteStatus } from "@/lib/status-colours";

interface QuoteActionsProps {
  quoteId: string;
  status: QuoteStatus;
  sending: boolean;
  duplicating: boolean;
  onPreview: () => void;
  onSend: () => void;
  onConvertToJob: () => void;
  onCreateInvoice: () => void;
  onDownloadPDF: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onDelete: () => void;
}

export function QuoteActions({
  quoteId,
  status,
  sending,
  duplicating,
  onPreview,
  onSend,
  onConvertToJob,
  onCreateInvoice,
  onDownloadPDF,
  onDuplicate,
  onSaveTemplate,
  onDelete,
}: QuoteActionsProps) {
  const isAccepted = status === "ACCEPTED";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
      {/* Primary actions — always visible */}
      <Button variant="secondary" size="sm" onClick={onPreview}>
        <Eye className="mr-2 h-4 w-4" />
        Preview
      </Button>
      <Button size="sm" onClick={onSend} disabled={sending}>
        {sending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Send Quote
      </Button>

      {/* Contextual — promoted when accepted */}
      {isAccepted && (
        <>
          <Button size="sm" onClick={onConvertToJob}>
            <Briefcase className="mr-2 h-4 w-4" />
            Convert to Job
          </Button>
          <Button variant="secondary" size="sm" onClick={onCreateInvoice}>
            <Receipt className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </>
      )}

      <Button variant="secondary" size="sm" onClick={onDownloadPDF}>
        <Download className="mr-2 h-4 w-4" />
        PDF
      </Button>

      {/* More actions dropdown */}
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        {!isAccepted && (
          <>
            <DropdownItem icon={Briefcase} label="Convert to Job" onClick={onConvertToJob} />
            <DropdownItem icon={Receipt} label="Create Invoice" onClick={onCreateInvoice} />
          </>
        )}
        <DropdownItem
          icon={Copy}
          label="Duplicate"
          onClick={onDuplicate}
          disabled={duplicating}
        />
        <DropdownItem icon={Bookmark} label="Save as Template" onClick={onSaveTemplate} />
        <DropdownDivider />
        <DropdownItem icon={Trash2} label="Delete Quote" onClick={onDelete} destructive />
      </DropdownMenu>

      <CloudExportButton fileType="quote_pdf" fileId={quoteId} />
    </div>
  );
}
