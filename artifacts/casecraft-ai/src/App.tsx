import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FilePlus2,
  FileText,
  Gavel,
  LoaderCircle,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Scale,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  getGetCaseFileQueryKey,
  getGetCaseFilesSummaryQueryKey,
  getListCaseFileMessagesQueryKey,
  getListCaseFilesQueryKey,
  useCreateCaseFile,
  useDeleteCaseFile,
  useGetCaseFile,
  useGetCaseFilesSummary,
  useListCaseFileMessages,
  useListCaseFiles,
  useUpdateCaseFile,
} from '@workspace/api-client-react';
import type { CaseFile, CaseFileMessage } from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const statusCopy: Record<string, string> = { active: 'Active', review: 'In review', completed: 'Completed' };
const matterColors: Record<string, string> = {
  'Criminal law': 'bg-[#f9e0d6] text-[#873d2f]',
  'Contract law': 'bg-[#e6e6f3] text-[#4c4c84]',
  'Constitutional law': 'bg-[#e8efd9] text-[#45613b]',
  'Tort law': 'bg-[#f4e7bd] text-[#75591b]',
};

function formatDate(date?: string | null) {
  if (!date) return 'No date set';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}
function formatTime(date?: string | null) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}
function initials(name?: string | null) {
  return (name || 'Unassigned').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const palette = status === 'completed' ? 'bg-[#e4eee0] text-[#466744]' : status === 'review' ? 'bg-[#f5e7be] text-[#785d1c]' : 'bg-[#dce7ed] text-[#385568]';
  return <span data-testid={`status-badge-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${palette}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{statusCopy[status] || status}</span>;
}

function LogoMark() {
  return <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4b957] text-[#17243a] shadow-[0_5px_16px_rgba(228,185,87,.25)]"><Scale size={19} strokeWidth={2.4} /></div>;
}

function Sidebar({ onCreate }: { onCreate: () => void }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button data-testid="button-open-navigation" className="fixed left-4 top-4 z-30 rounded-lg border border-[#d9d2c4] bg-[#fbfaf5] p-2.5 text-[#17243a] shadow-sm md:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
      {open && <button data-testid="button-close-navigation-overlay" className="fixed inset-0 z-40 bg-[#17243a]/35 md:hidden" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-[#17243a] px-4 py-5 text-[#eee9dd] transition-transform duration-200 md:relative md:z-auto md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/" data-testid="link-brand-home" className="flex items-center gap-3">
            <LogoMark />
            <div><div className="font-display text-[22px] leading-none tracking-tight text-[#f5f0e5]">CaseCraft</div><div className="mt-1 font-mono-app text-[9px] uppercase tracking-[.22em] text-[#a9b0b5]">AI case room</div></div>
          </Link>
          <button data-testid="button-close-navigation" className="rounded-md p-1 text-[#a9b0b5] hover:bg-[#26344d] md:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={17} /></button>
        </div>
        <div className="mt-10">
          <button data-testid="button-create-case-file-sidebar" onClick={onCreate} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e4b957] px-3 py-2.5 text-sm font-bold text-[#17243a] shadow-[0_5px_16px_rgba(228,185,87,.13)] hover:-translate-y-0.5"><Plus size={16} /> New case file</button>
        </div>
        <nav className="mt-8 space-y-1">
          <div className="px-3 pb-2 font-mono-app text-[9px] uppercase tracking-[.2em] text-[#86909c]">Workspace</div>
          <Link href="/" data-testid="link-workspace-overview" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${location === '/' ? 'bg-[#2a3a55] text-[#f6f0e4]' : 'text-[#afb6bd] hover:bg-[#22314a] hover:text-[#f6f0e4]'}`}><ClipboardList size={17} /><span>Overview</span></Link>
          <div className="mt-8 px-3 pb-2 font-mono-app text-[9px] uppercase tracking-[.2em] text-[#86909c]">Study note</div>
          <div className="rounded-lg border border-[#30405a] bg-[#20304a] p-3 text-xs leading-relaxed text-[#bfc4c6]"><Sparkles size={15} className="mb-2 text-[#e4b957]" /><p>CaseCraft organizes your thinking. It does not provide legal advice.</p></div>
        </nav>
        <div className="mt-auto border-t border-[#30405a] pt-4">
          <div className="flex items-center gap-3 px-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ced8dc] text-[11px] font-bold text-[#344b5e]">LS</div><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#f0ece2]">Law student workspace</div><div className="text-[11px] text-[#87929d]">Personal study room</div></div><MoreHorizontal size={17} className="ml-auto text-[#7c8994]" /></div>
        </div>
      </aside>
    </>
  );
}

function AppShell({ children, onCreate }: { children: ReactNode; onCreate: () => void }) {
  return <div className="flex min-h-[100dvh] bg-[#f4f1e9] text-[#17243a]"><Sidebar onCreate={onCreate} /><main className="min-w-0 flex-1">{children}</main></div>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <div className="paper-card flex min-h-[340px] flex-col items-center justify-center rounded-2xl border-dashed px-6 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9dfbf] text-[#715a25]"><FilePlus2 size={26} /></div><h3 className="font-display text-2xl text-[#23324a]">Your case room is quiet</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-[#68717b]">Start with the matter on your desk. CaseCraft will help you separate the facts from the questions.</p><button data-testid="button-create-first-case-file" onClick={onCreate} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#17243a] px-4 py-2.5 text-sm font-semibold text-[#f6f0e4] hover:-translate-y-0.5"><Plus size={16} /> Create a case file</button></div>;
}

function SummaryStrip({ summary }: { summary?: { total: number; active: number; review: number; completed: number } }) {
  const stats = [{ label: 'Total files', value: summary?.total ?? 0, icon: FileText }, { label: 'Active study', value: summary?.active ?? 0, icon: Gavel }, { label: 'In review', value: summary?.review ?? 0, icon: Pencil }, { label: 'Completed', value: summary?.completed ?? 0, icon: Check }];
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon }, index) => <div key={label} data-testid={`stat-card-${index}`} className="paper-card rounded-xl px-4 py-4"><div className="flex items-center justify-between"><span className="font-mono-app text-[10px] uppercase tracking-[.16em] text-[#7f8587]">{label}</span><Icon size={15} className={index === 1 ? 'text-[#b18426]' : 'text-[#8d9899]'} /></div><div data-testid={`text-stat-value-${index}`} className="mt-3 font-display text-3xl text-[#24344c]">{value}</div></div>)}</div>;
}

function CaseCard({ file }: { file: CaseFile }) {
  return <Link href={`/case-files/${file.id}`} data-testid={`card-case-file-${file.id}`} className="group paper-card block rounded-xl p-5 hover:-translate-y-0.5 hover:border-[#b9aa7c] hover:shadow-[0_18px_35px_rgba(23,36,58,.09)]">
    <div className="flex items-start justify-between gap-4"><span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${matterColors[file.matterType] || 'bg-[#e6e9e6] text-[#4c5a57]'}`}>{file.matterType}</span><StatusBadge status={file.status} /></div>
    <h3 data-testid={`text-case-title-${file.id}`} className="mt-5 font-display text-[25px] leading-tight text-[#24344c] group-hover:text-[#75591b]">{file.title}</h3>
    <div data-testid={`text-case-client-${file.id}`} className="mt-2 text-sm text-[#6d7479]">{file.clientName || 'Client not named'} <span className="mx-1 text-[#b1aa9d]">·</span> {file.jurisdiction}</div>
    <p className="mt-4 line-clamp-2 min-h-[42px] text-sm leading-relaxed text-[#727a80]">{file.summary || 'No summary yet. Open the file to begin organizing the matter.'}</p>
    <div className="mt-5 flex items-center justify-between border-t border-[#e7e1d4] pt-4"><div className="flex items-center gap-2 text-[11px] text-[#7b8387]"><MessageSquare size={14} /> {file.messagesCount} notes</div><div className="flex items-center gap-1.5 text-xs font-semibold text-[#6e5a2d] opacity-0 transition-opacity group-hover:opacity-100">Open file <ArrowUpRight size={14} /></div></div>
  </Link>;
}

function HomePage({ onCreate }: { onCreate: () => void }) {
  const filesQuery = useListCaseFiles();
  const summaryQuery = useGetCaseFilesSummary();
  const files = filesQuery.data || [];
  return <div className="workspace-grid min-h-[100dvh]"><header className="border-b border-[#ded7c9] bg-[#f4f1e9]/90 px-5 py-5 backdrop-blur md:px-10"><div className="mx-auto flex max-w-[1240px] items-end justify-between gap-4 pl-12 md:pl-0"><div><div className="font-mono-app text-[10px] uppercase tracking-[.22em] text-[#937a3b]">Thursday, October 24, 2024</div><h1 data-testid="heading-overview" className="mt-2 font-display text-4xl leading-none text-[#24344c] md:text-5xl">Your case room<span className="text-[#c49631]">.</span></h1><p className="mt-3 text-sm text-[#727a80]">A clear desk for difficult questions.</p></div><button data-testid="button-create-case-file-header" onClick={onCreate} className="hidden items-center gap-2 rounded-lg border border-[#cfc5af] bg-[#fbfaf5] px-3.5 py-2.5 text-sm font-semibold text-[#28384e] shadow-sm hover:border-[#b89b4c] sm:flex"><Plus size={16} /> New case file</button></div></header>
    <div className="mx-auto max-w-[1240px] space-y-8 px-5 py-7 md:px-10 md:py-10">
      {summaryQuery.isLoading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="h-[101px] animate-pulse rounded-xl bg-[#e7e1d5]" />)}</div> : summaryQuery.isError ? <div data-testid="error-summary" className="flex items-center gap-2 rounded-xl border border-[#e1b5a8] bg-[#f8e8e2] px-4 py-3 text-sm text-[#873d2f]"><CircleAlert size={16} /> Workspace summary is unavailable. Your files may still load below.</div> : <SummaryStrip summary={summaryQuery.data} />}
      <section><div className="mb-4 flex items-end justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#937a3b]">Your matters</div><h2 className="mt-1 font-display text-3xl text-[#24344c]">Recent case files</h2></div>{files.length > 0 && <span className="font-mono-app text-[11px] text-[#8a8d8b]">{files.length.toString().padStart(2, '0')} files</span>}</div>
        {filesQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-[300px] animate-pulse rounded-xl bg-[#e7e1d5]" />)}</div> : filesQuery.isError ? <div data-testid="error-case-files" className="paper-card flex min-h-[220px] flex-col items-center justify-center rounded-xl text-center"><CircleAlert className="text-[#b45442]" /><p className="mt-3 text-sm text-[#6b7378]">We could not load your case files.</p><button data-testid="button-retry-case-files" onClick={() => filesQuery.refetch()} className="mt-4 rounded-lg bg-[#17243a] px-3 py-2 text-sm font-semibold text-[#f6f0e4]">Try again</button></div> : files.length === 0 ? <EmptyState onCreate={onCreate} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{files.map((file) => <CaseCard key={file.id} file={file} />)}</div>}
      </section>
      {summaryQuery.data?.recentActivity?.length ? <section className="paper-card rounded-xl p-5 md:p-6"><div className="flex items-center justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#937a3b]">Paper trail</div><h2 className="mt-1 font-display text-2xl text-[#24344c]">Recent activity</h2></div><Archive size={18} className="text-[#9b917e]" /></div><div className="mt-5 divide-y divide-[#ebe5d9]">{summaryQuery.data.recentActivity.slice(0, 4).map((activity) => <Link href={`/case-files/${activity.id}`} key={activity.id} data-testid={`link-recent-activity-${activity.id}`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:text-[#75591b]"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#334157]">{activity.title}</div><div className="mt-1 text-xs text-[#858b8d]">{activity.activity}</div></div><div className="flex shrink-0 items-center gap-2 text-[11px] text-[#92938e]">{formatDate(activity.updatedAt)}<ChevronRight size={14} /></div></Link>)}</div></section> : null}
    </div>
  </div>;
}

type CreateDialogProps = { open: boolean; onClose: () => void };
function CreateDialog({ open, onClose }: CreateDialogProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const create = useCreateCaseFile();
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [matterType, setMatterType] = useState('Contract law');
  const [jurisdiction, setJurisdiction] = useState('');
  if (!open) return null;
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !jurisdiction.trim()) return; create.mutate({ data: { title: title.trim(), clientName: clientName.trim() || null, matterType, jurisdiction: jurisdiction.trim() } }, { onSuccess: (file) => { queryClient.invalidateQueries({ queryKey: getListCaseFilesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetCaseFilesSummaryQueryKey() }); setLocation(`/case-files/${file.id}`); onClose(); } }); };
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#17243a]/45 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" data-testid="dialog-create-case-file" className="paper-card w-full max-w-lg rounded-2xl p-6 shadow-2xl md:p-8"><div className="flex items-start justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-[.2em] text-[#937a3b]">New working file</div><h2 className="mt-2 font-display text-3xl text-[#24344c]">Name the matter</h2><p className="mt-2 text-sm text-[#737a7d]">You can fill in the thinking as it takes shape.</p></div><button data-testid="button-close-create-dialog" onClick={onClose} className="rounded-lg p-1.5 text-[#808587] hover:bg-[#eee8db]" aria-label="Close create dialog"><X size={19} /></button></div><form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="field-label">Matter title <em>*</em></span><input data-testid="input-case-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Orchard lease dispute" className="field-input" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="field-label">Client or party</span><input data-testid="input-case-client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Morgan Lee" className="field-input" /></label><label className="block"><span className="field-label">Jurisdiction <em>*</em></span><input data-testid="input-case-jurisdiction" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g. California" className="field-input" required /></label></div><label className="block"><span className="field-label">Matter type</span><select data-testid="select-case-matter-type" value={matterType} onChange={(e) => setMatterType(e.target.value)} className="field-input"><option>Contract law</option><option>Criminal law</option><option>Constitutional law</option><option>Tort law</option><option>Property law</option><option>Other</option></select></label><div className="mt-7 flex justify-end gap-3"><button type="button" data-testid="button-cancel-create-case" onClick={onClose} className="rounded-lg px-3.5 py-2.5 text-sm font-semibold text-[#6f777b] hover:bg-[#eee8db]">Cancel</button><button type="submit" data-testid="button-submit-create-case" disabled={create.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#17243a] px-4 py-2.5 text-sm font-semibold text-[#f7f2e8] disabled:opacity-60">{create.isPending && <LoaderCircle size={15} className="animate-spin" />} Create file</button></div>{create.isError && <p data-testid="error-create-case" className="mt-3 text-right text-xs text-[#a34b39]">Could not create the file. Check your connection and try again.</p>}</form></div></div>;
}

function LoadingDetail() { return <div className="mx-auto max-w-[1240px] space-y-5 px-5 py-8 md:px-10"><div className="h-8 w-48 animate-pulse rounded bg-[#e5dfd2]" /><div className="grid gap-5 lg:grid-cols-[minmax(320px,.85fr)_minmax(440px,1.45fr)]"><div className="h-[650px] animate-pulse rounded-2xl bg-[#e5dfd2]" /><div className="h-[650px] animate-pulse rounded-2xl bg-[#e5dfd2]" /></div></div>; }

function DetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileQuery = useGetCaseFile(id, { query: { enabled: Number.isFinite(id), queryKey: getGetCaseFileQueryKey(id) } });
  const messagesQuery = useListCaseFileMessages(id, { query: { enabled: Number.isFinite(id), queryKey: getListCaseFileMessagesQueryKey(id) } });
  const update = useUpdateCaseFile();
  const remove = useDeleteCaseFile();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CaseFile>>({});
  const file = fileQuery.data;
  const startEditing = () => { if (!file) return; setEditForm({ title: file.title, clientName: file.clientName, matterType: file.matterType, jurisdiction: file.jurisdiction, status: file.status, progress: file.progress, summary: file.summary, nextDeadline: file.nextDeadline, issues: file.issues, keyFacts: file.keyFacts, nextSteps: file.nextSteps }); setEditing(true); };
  const saveEditing = () => { if (!file || !editForm.title) return; update.mutate({ id, data: { ...editForm, issues: editForm.issues, keyFacts: editForm.keyFacts, nextSteps: editForm.nextSteps } }, { onSuccess: (next) => { queryClient.setQueryData(getGetCaseFileQueryKey(id), next); setEditing(false); } }); };
  const deleteFile = () => { if (!file || !window.confirm(`Delete “${file.title}”? This cannot be undone.`)) return; remove.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCaseFilesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetCaseFilesSummaryQueryKey() }); setLocation('/'); } }); };
  if (fileQuery.isLoading) return <LoadingDetail />;
  if (fileQuery.isError || !file) return <div className="flex min-h-[100dvh] items-center justify-center p-6"><div className="paper-card max-w-md rounded-2xl p-8 text-center"><CircleAlert className="mx-auto text-[#b45442]" /><h2 className="mt-4 font-display text-3xl text-[#24344c]">File not found</h2><p className="mt-2 text-sm text-[#70787d]">This case file may have moved or is not available yet.</p><Link href="/" data-testid="link-back-to-overview-error" className="mt-5 inline-flex rounded-lg bg-[#17243a] px-4 py-2.5 text-sm font-semibold text-[#f7f2e8]">Back to overview</Link></div></div>;
  return <div className="min-h-[100dvh] bg-[#f4f1e9]"><header className="border-b border-[#ded7c9] bg-[#f8f5ed] px-5 py-5 md:px-10"><div className="mx-auto max-w-[1240px]"><Link href="/" data-testid="link-back-to-overview" className="inline-flex items-center gap-2 text-xs font-semibold text-[#777e80] hover:text-[#6e5a2d]"><ArrowLeft size={14} /> All case files</Link><div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#937a3b]">{file.matterType}</span><StatusBadge status={file.status} /></div><h1 data-testid="heading-case-file-title" className="mt-3 max-w-3xl font-display text-4xl leading-[.98] text-[#24344c] md:text-5xl">{file.title}</h1><p data-testid="text-case-file-meta" className="mt-3 text-sm text-[#70787d]">{file.clientName || 'Client not named'} <span className="mx-1 text-[#b6afa3]">·</span> {file.jurisdiction} <span className="mx-1 text-[#b6afa3]">·</span> Updated {formatDate(file.updatedAt)}</p></div><div className="flex items-center gap-2"><button data-testid="button-edit-case-file" onClick={startEditing} className="inline-flex items-center gap-2 rounded-lg border border-[#ccc1aa] bg-[#fbfaf5] px-3.5 py-2.5 text-sm font-semibold text-[#344157] hover:border-[#ae9047]"><Pencil size={15} /> Edit file</button><button data-testid="button-delete-case-file" onClick={deleteFile} disabled={remove.isPending} className="rounded-lg border border-[#dec5bd] bg-[#fbf4f1] p-2.5 text-[#a04d3d] hover:bg-[#f5e5df]" aria-label="Delete case file"><Trash2 size={16} /></button></div></div></div></header>
    <div className="mx-auto max-w-[1240px] px-5 py-6 md:px-10 md:py-8"><div className="grid gap-5 lg:grid-cols-[minmax(320px,.82fr)_minmax(440px,1.45fr)]"><CaseFacts file={file} onEdit={startEditing} /><AssistantPanel id={id} messages={messagesQuery.data || []} loading={messagesQuery.isLoading} error={messagesQuery.isError} /></div></div>
    {editing && <EditDialog file={file} form={editForm} setForm={setEditForm} onClose={() => setEditing(false)} onSave={saveEditing} pending={update.isPending} error={update.isError} />}
  </div>;
}

function CaseFacts({ file, onEdit }: { file: CaseFile; onEdit: () => void }) {
  const lists = [{ label: 'Issues to resolve', items: file.issues, accent: 'bg-[#dce7ed]' }, { label: 'Key facts', items: file.keyFacts, accent: 'bg-[#f2e4b9]' }, { label: 'Next steps', items: file.nextSteps, accent: 'bg-[#e1ecd9]' }];
  return <section className="space-y-5"><div className="paper-card rounded-2xl p-5 md:p-6"><div className="flex items-center justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#937a3b]">Working brief</div><h2 className="mt-1 font-display text-2xl text-[#24344c]">What we know</h2></div><button data-testid="button-edit-facts" onClick={onEdit} className="rounded-lg p-2 text-[#7d8587] hover:bg-[#eee8db] hover:text-[#6e5a2d]" aria-label="Edit case facts"><Pencil size={15} /></button></div><p data-testid="text-case-summary" className="mt-5 text-[15px] leading-7 text-[#5e6971]">{file.summary || 'No working summary yet. Ask the assistant to help you make one, then capture it here.'}</p><div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#ebe5d9] pt-5"><div><div className="font-mono-app text-[9px] uppercase tracking-[.16em] text-[#959691]">Progress</div><div className="mt-2 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-[#e9e3d7]"><div className="h-2 rounded-full bg-[#d1a33f]" style={{ width: `${Math.min(100, file.progress)}%` }} /></div><span data-testid="text-case-progress" className="font-mono-app text-xs text-[#6e5a2d]">{file.progress}%</span></div></div><div><div className="font-mono-app text-[9px] uppercase tracking-[.16em] text-[#959691]">Next deadline</div><div data-testid="text-case-deadline" className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#35445a]"><CalendarDays size={14} className="text-[#b18426]" />{formatDate(file.nextDeadline)}</div></div></div></div>{lists.map((list) => <div key={list.label} className="paper-card rounded-2xl p-5 md:p-6"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${list.accent}`} /><h3 className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#737d80]">{list.label}</h3></div>{list.items?.length ? <ul className="mt-4 space-y-3">{list.items.map((item, index) => <li key={`${item}-${index}`} data-testid={`text-${list.label.replaceAll(' ', '-').toLowerCase()}-${index}`} className="flex gap-3 text-sm leading-relaxed text-[#56636b]"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#b69e65]" />{item}</li>)}</ul> : <p className="mt-4 text-sm italic text-[#959996]">Nothing captured here yet.</p>}</div>)}</section>;
}

function AssistantPanel({ id, messages, loading, error }: { id: number; messages: CaseFileMessage[]; loading: boolean; error: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [sendError, setSendError] = useState('');
  const [localMessages, setLocalMessages] = useState<CaseFileMessage[]>([]);
  const allMessages = useMemo(() => [...messages, ...localMessages], [messages, localMessages]);
  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setDraft(''); setSendError(''); setSending(true);
    const optimistic: CaseFileMessage = { id: Date.now(), caseFileId: id, role: 'user', content, createdAt: new Date().toISOString() };
    setLocalMessages((current) => [...current, optimistic]);
    try {
      const response = await fetch(`/api/case-files/${id}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify({ content }) });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body.toLowerCase().includes('provider') ? 'The AI provider is not configured for this workspace yet.' : body || 'The assistant could not respond.');
      }
      if (!response.body) throw new Error('The assistant returned an empty response.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let assistantText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try { const parsed = JSON.parse(data); assistantText += parsed.content || parsed.delta || parsed.text || ''; } catch { assistantText += data; }
          setStreaming(assistantText);
        }
      }
      setStreaming('');
      setLocalMessages((current) => assistantText ? [...current, { id: Date.now() + 1, caseFileId: id, role: 'assistant', content: assistantText, createdAt: new Date().toISOString() }] : current);
      await queryClient.invalidateQueries({ queryKey: getListCaseFileMessagesQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: getGetCaseFileQueryKey(id) });
      setLocalMessages([]);
    } catch (caught) {
      setSendError(caught instanceof Error ? caught.message : 'The assistant is unavailable right now.');
    } finally { setSending(false); }
  };
  return <section className="paper-card flex min-h-[680px] flex-col overflow-hidden rounded-2xl"><div className="border-b border-[#e7e0d4] bg-[#fbfaf5] px-5 py-5 md:px-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e5d9b5] text-[#6e5a2d]"><Sparkles size={16} /></div><div><div className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#937a3b]">CaseCraft assistant</div><div className="mt-0.5 text-xs text-[#778084]">For study and issue-spotting</div></div></div></div><span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#66806a]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6e9872]" /> Ready</span></div><div className="mt-5 flex flex-wrap gap-2">{['Summarize the dispute', 'What issues am I missing?', 'Build a timeline'].map((prompt) => <button key={prompt} data-testid={`button-suggestion-${prompt.replaceAll(' ', '-').toLowerCase().replace('?', '')}`} onClick={() => setDraft(prompt)} className="rounded-full border border-[#ddd3bd] bg-[#f9f5e9] px-3 py-1.5 text-[11px] font-semibold text-[#776533] hover:border-[#bca45f] hover:bg-[#f2e8cb]">{prompt}</button>)}</div></div><div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto bg-[#f8f6f0] px-5 py-6 md:px-6">{loading ? <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className={`flex gap-3 ${i === 2 ? 'justify-end' : ''}`}><div className="h-9 w-9 animate-pulse rounded-full bg-[#e2ddcf]" /><div className="h-16 w-2/3 animate-pulse rounded-xl bg-[#e8e3d8]" /></div>)}</div> : error ? <div data-testid="error-case-messages" className="rounded-xl border border-[#e1b5a8] bg-[#f8e8e2] p-4 text-sm text-[#873d2f]">Conversation history could not be loaded. You can still try sending a new note.</div> : allMessages.length === 0 && !streaming ? <div data-testid="empty-case-messages" className="flex h-full min-h-[400px] flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8e0c7] text-[#77612d]"><MessageSquare size={22} /></div><h3 className="mt-4 font-display text-2xl text-[#33435a]">Start with a question</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-[#7c8588]">Ask for a neutral summary, a timeline, or the strongest counterargument.</p></div> : <>{allMessages.map((message) => <MessageBubble key={message.id} message={message} />)}{streaming && <MessageBubble message={{ id: -1, caseFileId: id, role: 'assistant', content: streaming, createdAt: new Date().toISOString() }} streaming />}</>}</div><div className="border-t border-[#e3ddcf] bg-[#fbfaf5] p-4 md:p-5"><form onSubmit={send} className="relative"><textarea data-testid="input-assistant-message" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ask something about this case..." rows={2} className="w-full resize-none rounded-xl border border-[#d8cfbc] bg-[#f8f6ef] px-4 py-3 pr-12 text-sm text-[#344157] outline-none placeholder:text-[#9a9b95] focus:border-[#ae9047] focus:ring-2 focus:ring-[#e4b957]/20" /><button data-testid="button-send-assistant-message" type="submit" disabled={!draft.trim() || sending} className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#17243a] text-[#f8f2e7] disabled:cursor-not-allowed disabled:opacity-35 hover:bg-[#263754]" aria-label="Send message">{sending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}</button></form><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-[#94958f]">Study aid only — verify against your course materials.</span>{sendError && <span data-testid="error-send-message" className="text-right text-[10px] font-semibold text-[#a34b39]">{sendError}</span>}</div></div></section>;
}

function MessageBubble({ message, streaming = false }: { message: CaseFileMessage; streaming?: boolean }) {
  const assistant = message.role === 'assistant';
  return <div data-testid={`message-${message.id}`} className={`flex gap-3 ${assistant ? '' : 'justify-end'}`}><div className={`max-w-[88%] ${assistant ? 'order-2' : 'order-1'}`}><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${assistant ? 'rounded-tl-sm border border-[#e3dccd] bg-[#fffdf8] text-[#56636b]' : 'rounded-tr-sm bg-[#dfe9ec] text-[#334b5c]'}`}>{message.content}{streaming && <span className="ml-1 inline-block h-3 w-1 animate-pulse-line bg-[#bd8d2b]" />}</div><div className={`mt-1.5 px-1 font-mono-app text-[9px] text-[#a09f98] ${assistant ? '' : 'text-right'}`}>{assistant ? 'CaseCraft' : 'You'} · {formatTime(message.createdAt)}</div></div>{assistant && <div className="order-1 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e5d9b5] text-[#6e5a2d]"><Sparkles size={14} /></div>}</div>;
}

function EditDialog({ file, form, setForm, onClose, onSave, pending, error }: { file: CaseFile; form: Partial<CaseFile>; setForm: (form: Partial<CaseFile>) => void; onClose: () => void; onSave: () => void; pending: boolean; error: boolean }) {
  const changeList = (key: 'issues' | 'keyFacts' | 'nextSteps', value: string) => setForm({ ...form, [key]: value.split('\n').map((item) => item.trim()).filter(Boolean) });
  const listValue = (items?: string[]) => (items || []).join('\n');
  return <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#17243a]/45 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" data-testid="dialog-edit-case-file" className="paper-card my-6 w-full max-w-2xl rounded-2xl p-6 shadow-2xl md:p-8"><div className="flex items-start justify-between"><div><div className="font-mono-app text-[10px] uppercase tracking-[.2em] text-[#937a3b]">Edit working file</div><h2 className="mt-2 font-display text-3xl text-[#24344c]">Shape the record</h2></div><button data-testid="button-close-edit-dialog" onClick={onClose} className="rounded-lg p-1.5 text-[#808587] hover:bg-[#eee8db]"><X size={19} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="field-label">Matter title</span><input data-testid="input-edit-title" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field-input" /></label><label className="block"><span className="field-label">Client or party</span><input data-testid="input-edit-client" value={form.clientName || ''} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="field-input" /></label><label className="block"><span className="field-label">Jurisdiction</span><input data-testid="input-edit-jurisdiction" value={form.jurisdiction || ''} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} className="field-input" /></label><label className="block"><span className="field-label">Status</span><select data-testid="select-edit-status" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as CaseFile['status'] })} className="field-input"><option value="active">Active</option><option value="review">In review</option><option value="completed">Completed</option></select></label><label className="block"><span className="field-label">Progress (%)</span><input data-testid="input-edit-progress" type="number" min="0" max="100" value={form.progress ?? 0} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="field-input" /></label><label className="block sm:col-span-2"><span className="field-label">Working summary</span><textarea data-testid="input-edit-summary" rows={3} value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="field-input resize-none" /></label><label className="block"><span className="field-label">Issues <small>(one per line)</small></span><textarea data-testid="input-edit-issues" rows={4} value={listValue(form.issues)} onChange={(e) => changeList('issues', e.target.value)} className="field-input resize-none" /></label><label className="block"><span className="field-label">Key facts <small>(one per line)</small></span><textarea data-testid="input-edit-key-facts" rows={4} value={listValue(form.keyFacts)} onChange={(e) => changeList('keyFacts', e.target.value)} className="field-input resize-none" /></label><label className="block sm:col-span-2"><span className="field-label">Next steps <small>(one per line)</small></span><textarea data-testid="input-edit-next-steps" rows={3} value={listValue(form.nextSteps)} onChange={(e) => changeList('nextSteps', e.target.value)} className="field-input resize-none" /></label></div><div className="mt-7 flex justify-end gap-3"><button data-testid="button-cancel-edit-case" onClick={onClose} className="rounded-lg px-3.5 py-2.5 text-sm font-semibold text-[#6f777b] hover:bg-[#eee8db]">Cancel</button><button data-testid="button-save-edit-case" disabled={pending} onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-[#17243a] px-4 py-2.5 text-sm font-semibold text-[#f7f2e8] disabled:opacity-60">{pending && <LoaderCircle size={15} className="animate-spin" />} Save changes</button></div>{error && <p data-testid="error-update-case" className="mt-3 text-right text-xs text-[#a34b39]">Changes could not be saved. Please try again.</p>}</div></div>;
}

function Router({ onCreate }: { onCreate: () => void }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell onCreate={onCreate}><Switch><Route path="/" component={() => <HomePage onCreate={onCreate} />} /><Route path="/case-files/:id" component={DetailPage} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  const [createOpen, setCreateOpen] = useState(false);
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router onCreate={() => setCreateOpen(true)} /></WouterRouter><CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;