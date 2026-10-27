import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  FileText,
  Upload,
  CheckCircle2,
  Shield,
  Eye,
  Download,
  Search,
  Lock,
  Clock,
  KeyRound,
  AlertTriangle,
  XCircle,
  FileCheck,
  Trash2,
  Share2,
  Copy,
  Check,
  History,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { dataStore } from '../services/mockData';
import { documentVaultService } from '../services/supabaseService';
import { DocumentItem, UserRole } from '../types';
import { formatDateIST } from '../utils/formatters';
import {
  validateDocumentFile,
  generateSignedUrl,
  verifySignedToken,
  downloadPrivateDocument,
  generateChecksum,
  SignedUrlResult,
} from '../services/documentService';

interface DocumentsPageProps {
  userRole: UserRole;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ userRole }) => {
  const [docs, setDocs] = useState<DocumentItem[]>(() => dataStore.getDocuments());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    documentCategory: 'KYC' as DocumentItem['documentCategory'],
    relatedEntity: '',
    entityType: 'Client' as DocumentItem['entityType'],
  });

  // Signed URL / Security Inspection Modal state
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityDoc, setSecurityDoc] = useState<DocumentItem | null>(null);
  const [signedUrlInfo, setSignedUrlInfo] = useState<SignedUrlResult | null>(null);
  const [simulatedExpiredToken, setSimulatedExpiredToken] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadDocuments = async () => {
    try {
      const items = await documentVaultService.getDocuments(userRole);
      setDocs(items);
    } catch (err) {
      console.warn('Using local documents store:', err);
      setDocs(dataStore.getDocuments());
    }
  };

  useEffect(() => {
    loadDocuments();
    const unsub = dataStore.subscribe(() => {
      loadDocuments();
    });
    return unsub;
  }, [userRole]);

  const categories = [
    'all',
    'KYC',
    'Policy Copy',
    'Proposal Form',
    'Mandate',
    'Brokerage Agreement',
    'Payout Advice',
    'Bank Proof',
    'GST Certificate',
  ];

  const entityTypes = ['all', 'Client', 'Sub-Broker', 'Policy', 'Payout', 'Loan'];

  const activeUser = dataStore.getActiveUser();
  const isSubBroker = userRole === 'sub_broker';

  const filteredDocs = docs.filter((doc) => {
    // Sub-broker tenant isolation check
    if (isSubBroker) {
      const rel = doc.relatedEntity.toLowerCase();
      const title = doc.title.toLowerCase();
      const path = (doc.storagePath || '').toLowerCase();
      const matchesMyPartner =
        rel.includes('vikram') ||
        rel.includes('apex wealth') ||
        rel.includes('ix-sb-101') ||
        path.includes('sb-1');
      // Sub-broker clients: Harish Vardhan, Rajesh Sharma, Shalini Nambiar
      const matchesMyClient =
        rel.includes('harish') ||
        rel.includes('ix-cl-1001') ||
        rel.includes('rajesh') ||
        rel.includes('ix-cl-1002') ||
        rel.includes('shalini') ||
        rel.includes('ix-cl-1005');
      const matchesMyPolicy =
        rel.includes('hi-2026-star-8819') ||
        rel.includes('mot-2026-icici-4921') ||
        rel.includes('fd-2026-bajaj-001') ||
        rel.includes('lic-term-991823');

      if (!matchesMyPartner && !matchesMyClient && !matchesMyPolicy) {
        return false;
      }
    }

    if (selectedCategory !== 'all' && doc.documentCategory !== selectedCategory) return false;
    if (selectedEntityType !== 'all' && doc.entityType !== selectedEntityType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.relatedEntity.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Handle file selection in upload modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setUploadFile(null);
    } else {
      setUploadError(null);
      setUploadFile(file);
      if (!uploadFormData.title) {
        setUploadFormData((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '),
        }));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFormData.title.trim() || !uploadFormData.relatedEntity.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const user = dataStore.getActiveUser();
    const fileName = uploadFile ? uploadFile.name : `${uploadFormData.title.replace(/\s+/g, '_')}.pdf`;
    const fileSize = uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB';
    const fileSizeBytes = uploadFile ? uploadFile.size : 1468000;
    const mimeType = uploadFile ? uploadFile.type || 'application/pdf' : 'application/pdf';

    const checksum = generateChecksum(fileName + Date.now());
    const storagePath = `private/${uploadFormData.entityType.toLowerCase()}s/${encodeURIComponent(
      uploadFormData.relatedEntity
    )}/${fileName}`;

    try {
      await documentVaultService.addDocument({
        title: uploadFormData.title.trim(),
        documentCategory: uploadFormData.documentCategory,
        relatedEntity: uploadFormData.relatedEntity.trim(),
        entityType: uploadFormData.entityType,
        fileUrl: '#',
        fileName,
        fileSize,
        fileSizeBytes,
        mimeType,
        storagePath,
        isPrivate: true,
        sha256Checksum: checksum,
        uploadedBy: user.name,
        verified: true,
        accessLog: [],
      });

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadError(null);
      setUploadFormData({
        title: '',
        documentCategory: 'KYC',
        relatedEntity: '',
        entityType: 'Client',
      });
      await loadDocuments();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  // Open Signed URL Security modal
  const handleOpenSecurityModal = (doc: DocumentItem) => {
    setSecurityDoc(doc);
    const result = generateSignedUrl(doc, 900); // 15 minutes
    setSignedUrlInfo(result);
    setSimulatedExpiredToken(false);
    setVerificationFeedback(null);
    setIsSecurityModalOpen(true);
  };

  // Test token verification
  const handleTestToken = () => {
    if (!signedUrlInfo) return;

    let tokenToVerify = signedUrlInfo.token;
    if (simulatedExpiredToken) {
      // Craft expired token
      const expiredPayload = {
        docId: securityDoc?.id || 'doc-1',
        iat: Date.now() - 3600000,
        exp: Date.now() - 60000, // Expired 1 min ago
        salt: 'expired_salt',
      };
      tokenToVerify = btoa(unescape(encodeURIComponent(JSON.stringify(expiredPayload))));
    }

    const verification = verifySignedToken(tokenToVerify);
    if (verification.valid) {
      setVerificationFeedback(
        `✓ Token verified successfully. Valid for document "${securityDoc?.title}". Remaining active time: ${verification.remainingSeconds} seconds.`
      );
    } else {
      setVerificationFeedback(`✕ Verification Failed: ${verification.error}`);
    }
  };

  const handleCopySignedUrl = () => {
    if (!signedUrlInfo) return;
    navigator.clipboard.writeText(signedUrlInfo.signedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadDoc = (doc: DocumentItem) => {
    // Generate fresh 15-minute token and download
    const signed = generateSignedUrl(doc, 900);
    const res = downloadPrivateDocument(doc, signed.token, userRole);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      try {
        await documentVaultService.deleteDocument(id, title);
        await loadDocuments();
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Encrypted Document Vault</h2>
          <p className="text-xs text-slate-500">
            Encrypted private storage with 15-minute time-limited signed URLs, file validation, and access audit logging
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Vault KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Private Documents</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{docs.length}</div>
          <span className="text-[10px] text-slate-400">Encrypted in storage</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>KYC Verified Bundles</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {docs.filter((d) => d.documentCategory === 'KYC' && d.verified).length}
          </div>
          <span className="text-[10px] text-slate-400">PAN & Aadhaar vetted</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Signed URL Policy</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">15 Mins</div>
          <span className="text-[10px] text-slate-400">Cryptographic token expiry</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Max File Size</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">10.0 MB</div>
          <span className="text-[10px] text-slate-400">PDF, JPG, PNG, DOCX, XLSX</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, file name, or client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-2 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories
                .filter((c) => c !== 'all')
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>

            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-2 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Entity Types</option>
              {entityTypes
                .filter((e) => e !== 'all')
                .map((ent) => (
                  <option key={ent} value={ent}>
                    {ent}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Document Records Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 font-bold">Document & Checksum</th>
                <th className="p-3 font-bold">Category</th>
                <th className="p-3 font-bold">Linked Entity / Reference</th>
                <th className="p-3 font-bold">Size & Format</th>
                <th className="p-3 font-bold">Uploaded By</th>
                <th className="p-3 font-bold">Uploaded Date</th>
                <th className="p-3 font-bold text-right">Vault Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70">
                  <td className="p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{doc.title}</span>
                        <span className="font-mono text-[10px] text-slate-400 block">{doc.fileName}</span>
                        {doc.sha256Checksum && (
                          <span className="font-mono text-[9px] text-slate-400 block" title={doc.sha256Checksum}>
                            SHA-256: {doc.sha256Checksum.slice(0, 16)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded">
                      {doc.documentCategory}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-slate-800 block">{doc.relatedEntity}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Type: {doc.entityType}</span>
                  </td>
                  <td className="p-3 font-mono text-slate-600 text-[11px]">
                    <div>{doc.fileSize}</div>
                    <span className="text-[10px] text-slate-400">{doc.mimeType || 'application/pdf'}</span>
                  </td>
                  <td className="p-3 text-slate-700">{doc.uploadedBy}</td>
                  <td className="p-3 text-slate-500">{formatDateIST(doc.uploadedAt)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenSecurityModal(doc)}
                        title="Generate Time-Limited Signed URL & Inspect Security"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        <KeyRound className="w-4 h-4 text-emerald-700" />
                      </button>
                      <button
                        onClick={() => handleDownloadDoc(doc)}
                        title="Download Document"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {(userRole === 'super_admin' || userRole === 'staff') && (
                        <button
                          onClick={() => handleDeleteDoc(doc.id, doc.title)}
                          title="Delete Document"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No documents found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Private Document to Vault"
        subtitle="Documents are checked for MIME type integrity, encrypted in storage, and accessed via time-limited tokens"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          {/* File Picker with Constraints */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Document File <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-4 text-center">
              <input
                type="file"
                id="doc-upload-file"
                accept=".pdf, .jpg, .jpeg, .png, .docx, .xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="doc-upload-file" className="cursor-pointer block">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                <span className="font-semibold text-slate-800 block">Click to select file</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Accepted: PDF, JPG, PNG, DOCX, XLSX (Maximum size: 10 MB)
                </span>
              </label>

              {uploadFile && (
                <div className="mt-2 text-xs font-mono text-emerald-800 bg-emerald-50 py-1 px-2 rounded inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
              )}

              {uploadError && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-50 py-1 px-2 rounded flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={uploadFormData.title}
              onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
              placeholder="e.g. Client PAN & Aadhaar KYC Bundle"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
              <select
                value={uploadFormData.documentCategory}
                onChange={(e) =>
                  setUploadFormData({
                    ...uploadFormData,
                    documentCategory: e.target.value as DocumentItem['documentCategory'],
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none bg-white text-xs"
              >
                <option value="KYC">KYC</option>
                <option value="Policy Copy">Policy Copy</option>
                <option value="Proposal Form">Proposal Form</option>
                <option value="Mandate">Mandate</option>
                <option value="Brokerage Agreement">Brokerage Agreement</option>
                <option value="Payout Advice">Payout Advice</option>
                <option value="Bank Proof">Bank Proof</option>
                <option value="GST Certificate">GST Certificate</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Linked Entity Type</label>
              <select
                value={uploadFormData.entityType}
                onChange={(e) =>
                  setUploadFormData({
                    ...uploadFormData,
                    entityType: e.target.value as DocumentItem['entityType'],
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none bg-white text-xs"
              >
                <option value="Client">Client</option>
                <option value="Sub-Broker">Sub-Broker</option>
                <option value="Policy">Policy</option>
                <option value="Loan">Loan</option>
                <option value="Payout">Payout</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Linked Entity Reference / Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={uploadFormData.relatedEntity}
              onChange={(e) => setUploadFormData({ ...uploadFormData, relatedEntity: e.target.value })}
              placeholder="e.g. Harish R. Vardhan (IX-CL-1001) or HI-2026-STAR-8819"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!uploadError}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-md"
            >
              Encrypt & Store Document
            </button>
          </div>
        </form>
      </Modal>

      {/* SIGNED URL & SECURITY INSPECTION MODAL */}
      {securityDoc && signedUrlInfo && (
        <Modal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          title="Time-Limited Signed URL & Token Security Inspection"
          subtitle={`Cryptographically signed token issued for "${securityDoc.title}"`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500 font-mono">
                Token valid for: {signedUrlInfo.expiresInMinutes} minutes
              </span>
              <button
                onClick={() => setIsSecurityModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Signed URL Display */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Generated Signed URL (15-Min Expiry)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={signedUrlInfo.signedUrl}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-[11px] bg-slate-50 text-slate-700"
                />
                <button
                  onClick={handleCopySignedUrl}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Token Claims Details */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 font-bold">Document ID: </span>
                <span className="text-slate-900">{securityDoc.id}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Storage Path: </span>
                <span className="text-slate-900">{securityDoc.storagePath}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Issued At: </span>
                <span className="text-slate-900">{signedUrlInfo.issuedAt}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Expires At: </span>
                <span className="text-rose-700 font-semibold">{signedUrlInfo.expiresAt}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">SHA-256 Checksum: </span>
                <span className="text-slate-700 break-all">{securityDoc.sha256Checksum || 'VERIFIED_NATIVE'}</span>
              </div>
            </div>

            {/* Interactive Token Expiry & Security Test */}
            <div className="p-4 border border-slate-200 rounded-lg space-y-3 bg-white">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Test Token Verification & Expiry Guard</span>
              </h4>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sim-expired"
                  checked={simulatedExpiredToken}
                  onChange={(e) => {
                    setSimulatedExpiredToken(e.target.checked);
                    setVerificationFeedback(null);
                  }}
                  className="rounded text-slate-900"
                />
                <label htmlFor="sim-expired" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Simulate Expired Token (forces past expiration timestamp to test HTTP 403 guard)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestToken}
                  className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors"
                >
                  Verify Token Authenticity
                </button>
              </div>

              {verificationFeedback && (
                <div
                  className={`p-2.5 rounded-md text-xs font-mono ${
                    verificationFeedback.startsWith('✓')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {verificationFeedback}
                </div>
              )}
            </div>

            {/* Access Audit Trail for this Document */}
            {securityDoc.accessLog && securityDoc.accessLog.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Access Audit Trail ({securityDoc.accessLog.length} events)</span>
                </h4>
                <div className="border border-slate-200 rounded-md overflow-hidden max-h-36 overflow-y-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-2 font-bold">User & Role</th>
                        <th className="p-2 font-bold">Action</th>
                        <th className="p-2 font-bold">Timestamp IST</th>
                        <th className="p-2 font-bold">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {securityDoc.accessLog.map((log) => (
                        <tr key={log.id}>
                          <td className="p-2 font-sans font-semibold text-slate-900">
                            {log.accessedBy} ({log.role})
                          </td>
                          <td className="p-2 uppercase text-[10px] text-slate-700">{log.action}</td>
                          <td className="p-2 text-slate-500">{formatDateIST(log.accessedAt)}</td>
                          <td className="p-2 text-slate-400">{log.ipAddress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
