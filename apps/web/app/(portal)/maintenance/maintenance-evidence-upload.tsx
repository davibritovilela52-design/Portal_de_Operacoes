'use client';

import { useRef } from 'react';

import { registerMaintenanceEvidenceAction } from '../operations-actions';

type MaintenanceEvidenceUploadProps = {
  ticketId: string;
  assetId: string;
  returnTo: string;
};

const acceptedAttachmentTypes =
  'image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.mp4';

export function MaintenanceEvidenceUpload({
  ticketId,
  assetId,
  returnTo
}: MaintenanceEvidenceUploadProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickFile = () => {
    const fileInput = fileInputRef.current;
    const form = formRef.current;

    if (!fileInput) {
      return;
    }

    if (fileInput.files?.length && form) {
      form.requestSubmit();
      return;
    }

    fileInput.click();
  };

  return (
    <form ref={formRef} action={registerMaintenanceEvidenceAction} className="maintenance-evidence-upload">
      <input name="ticketId" type="hidden" value={ticketId} />
      <input name="assetId" type="hidden" value={assetId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="evidenceType" type="hidden" value="execution_evidence" />
      <input
        ref={fileInputRef}
        accept={acceptedAttachmentTypes}
        aria-label="Selecionar arquivo para anexar ao chamado"
        hidden
        name="attachment"
        type="file"
      />

      <button
        className="action-button action-button--ghost"
        type="button"
        onClick={handlePickFile}
      >
        Anexar arquivo
      </button>
    </form>
  );
}
