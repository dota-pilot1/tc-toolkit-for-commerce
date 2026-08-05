import {
  Check,
  ChevronRight,
  CircleHelp,
  CloudCog,
  FileText,
  GitBranch,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import PageHeader from "../../shared/ui/PageHeader";
import { useColumnResize } from "../../shared/lib/useColumnResize";
import ColumnResizeHandle from "../../shared/ui/ColumnResizeHandle";
import DocumentDrawer from "../../shared/ui/DocumentDrawer";
import OrderControls from "../../shared/ui/OrderControls";
import {
  createArchitectureCategory,
  createArchitectureDocument,
  createArchitectureDocumentComment,
  createArchitectureTopic,
  deleteArchitectureCategory,
  deleteArchitectureDocument,
  deleteArchitectureDocumentComment,
  deleteArchitectureTopic,
  listArchitectureDocumentComments,
  listArchitecturePlaybook,
  moveArchitectureDocument,
  updateArchitectureDocumentComment,
  updateArchitectureCategory,
  updateArchitectureDocument,
  updateArchitectureTopic,
  type ArchitecturePlaybookCategory,
  type ArchitecturePlaybookDocument,
  type ArchitecturePlaybookTopic,
} from "../../features/mybatis-playbook/api";

type TitleDialog = {
  kind: "category" | "topic";
  mode: "delete";
  target: ArchitecturePlaybookCategory | ArchitecturePlaybookTopic;
};
type DocumentDialog = {
  mode: "create" | "edit" | "delete";
  target?: ArchitecturePlaybookDocument;
  parentId?: string | null;
  parentTitle?: string;
};

const CATEGORY_WIDTH_KEY = "architecture-playbook-category-width-v2";
const TOPIC_WIDTH_KEY = "architecture-playbook-topic-width-v2";

function readStoredWidth(
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function flattenDocuments(documents: ArchitecturePlaybookDocument[]) {
  const children = new Map<string, ArchitecturePlaybookDocument[]>();
  const roots: ArchitecturePlaybookDocument[] = [];
  for (const document of documents) {
    if (document.parentId) {
      const siblings = children.get(document.parentId) ?? [];
      siblings.push(document);
      children.set(document.parentId, siblings);
    } else {
      roots.push(document);
    }
  }
  const rows: { document: ArchitecturePlaybookDocument; depth: number }[] = [];
  function visit(items: ArchitecturePlaybookDocument[], depth: number) {
    for (const document of items) {
      rows.push({ document, depth });
      visit(children.get(document.id) ?? [], depth + 1);
    }
  }
  visit(roots, 0);
  return rows;
}

function MybatisPlaybookModule() {
  const [categories, setCategories] = useState<ArchitecturePlaybookCategory[]>(
    [],
  );
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [titleDialog, setTitleDialog] = useState<TitleDialog | null>(null);
  const [documentDialog, setDocumentDialog] = useState<DocumentDialog | null>(
    null,
  );
  const [detail, setDetail] = useState<ArchitecturePlaybookDocument | null>(
    null,
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expandedDocumentIds, setExpandedDocumentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [inlineTitle, setInlineTitle] = useState({ category: "", topic: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [categoryWidth, setCategoryWidth] = useState(() =>
    readStoredWidth(CATEGORY_WIDTH_KEY, 400, 300, 560),
  );
  const [topicWidth, setTopicWidth] = useState(() =>
    readStoredWidth(TOPIC_WIDTH_KEY, 400, 320, 560),
  );

  const category =
    categories.find((item) => item.id === categoryId) ?? categories[0];
  const topics = category?.topics ?? [];
  const topic = topics.find((item) => item.id === topicId) ?? topics[0];
  const documents = topic?.documents ?? [];
  const documentRows = flattenDocuments(documents).filter(({ document }) => {
    let parentId = document.parentId ?? null;
    while (parentId) {
      if (!expandedDocumentIds.has(parentId)) return false;
      const parent = documents.find((item) => item.id === parentId);
      parentId = parent?.parentId ?? null;
    }
    return true;
  });
  const document =
    documents.find((item) => item.id === documentId) ?? documents[0];
  const resizeCategory = useColumnResize(categoryWidth, setCategoryWidth, {
    min: 300,
    max: 560,
  });
  const resizeTopic = useColumnResize(topicWidth, setTopicWidth, {
    min: 320,
    max: 560,
  });

  useEffect(() => {
    window.localStorage.setItem(CATEGORY_WIDTH_KEY, String(categoryWidth));
  }, [categoryWidth]);
  useEffect(() => {
    window.localStorage.setItem(TOPIC_WIDTH_KEY, String(topicWidth));
  }, [topicWidth]);

  useEffect(() => {
    const documentIds = new Set(documents.map((item) => item.id));
    setExpandedDocumentIds((current) => {
      const next = new Set(
        [...current].filter((id) => documentIds.has(id)),
      );
      return next.size === current.size ? current : next;
    });
  }, [topicId, documents]);

  async function load(
    nextCategoryId?: string,
    nextTopicId?: string,
    nextDocumentId?: string,
  ) {
    try {
      const items = await listArchitecturePlaybook();
      const nextCategory =
        items.find((item) => item.id === nextCategoryId) ?? items[0];
      const nextTopic =
        nextCategory?.topics.find((item) => item.id === nextTopicId) ??
        nextCategory?.topics[0];
      const nextDocument =
        nextTopic?.documents.find((item) => item.id === nextDocumentId) ??
        nextTopic?.documents[0];
      setCategories(items);
      setCategoryId(nextCategory?.id ?? "");
      setTopicId(nextTopic?.id ?? "");
      setDocumentId(nextDocument?.id ?? "");
      setError("");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "MyBatis 플레이북을 불러오지 못했습니다.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function openDeleteTitleDialog(
    target: ArchitecturePlaybookCategory | ArchitecturePlaybookTopic,
    kind: "category" | "topic",
  ) {
    setTitleDialog({ kind, mode: "delete", target });
  }
  function openDocumentDialog(state: DocumentDialog) {
    setDocumentDialog({
      ...state,
      parentId: state.parentId ?? state.target?.parentId ?? null,
    });
    setTitle(state.target?.title ?? "");
    setBody(state.target?.content ?? "");
  }
  async function createInline(kind: "category" | "topic") {
    const nextTitle = inlineTitle[kind].trim();
    if (!nextTitle || (kind === "topic" && !category)) return;
    setBusy(true);
    try {
      if (kind === "category") {
        const next = await createArchitectureCategory(nextTitle);
        setInlineTitle((current) => ({ ...current, category: "" }));
        await load(next?.id ?? category?.id);
      } else if (category) {
        const next = await createArchitectureTopic(category.id, nextTitle);
        const created = next?.topics.find((item) => item.title === nextTitle);
        setInlineTitle((current) => ({ ...current, topic: "" }));
        await load(category.id, created?.id ?? topic?.id);
      }
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "추가하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveInlineTitle(
    kind: "category" | "topic",
    target: ArchitecturePlaybookCategory | ArchitecturePlaybookTopic,
    nextTitle: string,
  ) {
    if (!nextTitle.trim() || busy) return;
    setBusy(true);
    try {
      if (kind === "category")
        await updateArchitectureCategory(target.id, nextTitle.trim());
      else await updateArchitectureTopic(target.id, nextTitle.trim());
      await load(category?.id, topic?.id, document?.id);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "저장하지 못했습니다.",
      );
      throw reason;
    } finally {
      setBusy(false);
    }
  }
  async function saveDocumentTitle(
    target: ArchitecturePlaybookDocument,
    nextTitle: string,
  ) {
    if (!nextTitle.trim() || busy) return;
    setBusy(true);
    try {
      await updateArchitectureDocument(target.id, { title: nextTitle.trim() });
      setDetail((current) =>
        current?.id === target.id
          ? { ...current, title: nextTitle.trim() }
          : current,
      );
      await load(category?.id, topic?.id, target.id);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "문서 제목을 저장하지 못했습니다.",
      );
      throw reason;
    } finally {
      setBusy(false);
    }
  }
  async function deleteTitleDialog() {
    if (!titleDialog) return;
    setBusy(true);
    try {
      if (titleDialog.kind === "category")
        await deleteArchitectureCategory(titleDialog.target.id);
      else await deleteArchitectureTopic(titleDialog.target.id);
      await load(category?.id);
      setTitleDialog(null);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "삭제하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveDocumentDialog() {
    if (!documentDialog || !title.trim() || !topic) return;
    setBusy(true);
    try {
      if (documentDialog.mode === "edit" && documentDialog.target)
        await updateArchitectureDocument(documentDialog.target.id, {
          title: title.trim(),
          content: body,
          parentId: documentDialog.parentId ?? null,
        });
      else
        await createArchitectureDocument(topic.id, {
          title: title.trim(),
          content: body,
          parentId: documentDialog.parentId ?? null,
        });
      await load(category?.id, topic.id, documentDialog.target?.id);
      setDocumentDialog(null);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Lexical 문서를 저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deleteDocumentDialog() {
    if (!documentDialog?.target) return;
    setBusy(true);
    try {
      await deleteArchitectureDocument(documentDialog.target.id);
      await load(category?.id, topic?.id);
      setDocumentDialog(null);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Lexical 문서를 삭제하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function moveDocument(
    item: ArchitecturePlaybookDocument,
    direction: "up" | "down",
  ) {
    setBusy(true);
    try {
      await moveArchitectureDocument(item.id, direction);
      await load(category?.id, topic?.id, item.id);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "문서 순서를 바꾸지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  const layoutStyle = {
    "--architecture-category-width": `${categoryWidth}px`,
    "--architecture-topic-width": `${topicWidth}px`,
  } as CSSProperties;
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader>
        <CloudCog className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          MyBatis Playbook
        </span>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="ui-icon-button ml-2 h-7 w-7"
          title="사용 방법"
        >
          <CircleHelp className="size-4" />
        </button>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted p-5">
        {error && (
          <div className="mx-auto mb-4 max-w-[1600px] rounded-md border border-[var(--destructive)] bg-danger-glass px-4 py-3 text-xs font-bold text-[var(--destructive)]">
            {error}
          </div>
        )}
        <main
          className="architecture-playbook-layout mx-auto min-h-[720px] w-full max-w-[1600px] gap-1"
          style={layoutStyle}
        >
          <Panel
            className="architecture-playbook-column architecture-playbook-category"
            title="1차 MyBatis 영역"
            count={categories.length}
            placeholder="새 MyBatis 영역"
            draft={inlineTitle.category}
            onDraftChange={(value) =>
              setInlineTitle((current) => ({ ...current, category: value }))
            }
            onSubmit={() => void createInline("category")}
          >
            {categories.map((item) => (
              <InlineTitleRow
                key={item.id}
                title={item.title}
                active={item.id === category?.id}
                busy={busy}
                onClick={() => void load(item.id)}
                onSave={(nextTitle) =>
                  saveInlineTitle("category", item, nextTitle)
                }
                onDelete={() => openDeleteTitleDialog(item, "category")}
              />
            ))}
          </Panel>
          <ColumnResizeHandle onMouseDown={resizeCategory} />
          <Panel
            className="architecture-playbook-column architecture-playbook-topic"
            title="2차 MyBatis 주제"
            count={topics.length}
            placeholder="새 MyBatis 주제"
            draft={inlineTitle.topic}
            onDraftChange={(value) =>
              setInlineTitle((current) => ({ ...current, topic: value }))
            }
            onSubmit={category ? () => void createInline("topic") : undefined}
          >
            {topics.map((item) => (
              <InlineTitleRow
                key={item.id}
                title={item.title}
                icon
                active={item.id === topic?.id}
                busy={busy}
                onClick={() => void load(category?.id, item.id)}
                onSave={(nextTitle) =>
                  saveInlineTitle("topic", item, nextTitle)
                }
                onDelete={() => openDeleteTitleDialog(item, "topic")}
              />
            ))}
          </Panel>
          <ColumnResizeHandle onMouseDown={resizeTopic} />
          <section className="architecture-playbook-content flex min-h-0 flex-col rounded-md border border-surface-border bg-surface-raised shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-brand-primary">
                  {category?.title ?? "MyBatis 영역"} &gt;{" "}
                  {topic?.title ?? "MyBatis 주제"}
                </p>
                <h1 className="mt-1 truncate text-lg font-black text-text-primary">
                  {topic?.title ?? "주제를 선택하세요"}
                </h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {topic && (
                  <button
                    type="button"
                    onClick={() => openDocumentDialog({ mode: "create" })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-black text-brand-primary"
                    title="문서 추가"
                  >
                    <Plus className="size-3.5" />
                    문서 추가
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    void load(category?.id, topic?.id, document?.id)
                  }
                  className="ui-icon-button h-9 w-9"
                  title="새로고침"
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {documentRows.length ? (
                <div className="space-y-2">
                  {documentRows.map(({ document: item, depth }, index) => {
                    const hasChildren = documents.some(
                      (document) => document.parentId === item.id,
                    );
                    const expanded = expandedDocumentIds.has(item.id);
                    const siblings = documentRows.filter(
                      (row) =>
                        (row.document.parentId ?? null) ===
                        (item.parentId ?? null),
                    );
                    const siblingIndex = siblings.findIndex(
                      (row) => row.document.id === item.id,
                    );
                    return (
                      <InlineTitleRow
                        key={item.id}
                        title={item.title}
                        number={index + 1}
                        depth={depth}
                        active={item.id === document?.id}
                        busy={busy}
                        onRowClick={() => {
                          setDocumentId(item.id);
                          setDetail(null);
                        }}
                        onOpen={() => {
                          setDocumentId(item.id);
                          setDetail(item);
                        }}
                        onAddChild={
                          depth === 0
                            ? () =>
                                openDocumentDialog({
                                  mode: "create",
                                  parentId: item.id,
                                  parentTitle: item.title,
                                })
                            : undefined
                        }
                        hasChildren={hasChildren}
                        expanded={expanded}
                        onToggle={() =>
                          setExpandedDocumentIds((current) => {
                            const next = new Set(current);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          })
                        }
                        onSave={(nextTitle) => saveDocumentTitle(item, nextTitle)}
                        onDelete={() =>
                          openDocumentDialog({ mode: "delete", target: item })
                        }
                        extraActions={
                          <OrderControls
                            itemLabel={item.title}
                            busy={busy}
                            upDisabled={siblingIndex === 0}
                            downDisabled={siblingIndex === siblings.length - 1}
                            onMoveUp={() => void moveDocument(item, "up")}
                            onMoveDown={() => void moveDocument(item, "down")}
                          />
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-48 place-items-center text-sm font-semibold text-text-muted">
                  Lexical 문서를 추가하세요.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      {titleDialog && (
        <TitleDialog
          state={titleDialog}
          busy={busy}
          onClose={() => setTitleDialog(null)}
          onSave={deleteTitleDialog}
        />
      )}
      {documentDialog && (
        <DocumentDialog
          state={documentDialog}
          title={title}
          body={body}
          busy={busy}
          onTitle={setTitle}
          onBody={setBody}
          onClose={() => setDocumentDialog(null)}
          onSave={
            documentDialog.mode === "delete"
              ? deleteDocumentDialog
              : saveDocumentDialog
          }
        />
      )}
      {detail && (
        <DocumentDrawer
          document={detail}
          previous={
            documents[documents.findIndex((item) => item.id === detail.id) - 1]
          }
          next={
            documents[documents.findIndex((item) => item.id === detail.id) + 1]
          }
          onNavigate={(nextDocument) => {
            setDocumentId(nextDocument.id);
            setDetail(nextDocument);
          }}
          onEdit={() => {
            const target = detail;
            setDetail(null);
            openDocumentDialog({ mode: "edit", target });
          }}
          onDelete={() => {
            const target = detail;
            setDetail(null);
            openDocumentDialog({ mode: "delete", target });
          }}
          commentApi={{
            list: listArchitectureDocumentComments,
            create: createArchitectureDocumentComment,
            update: updateArchitectureDocumentComment,
            delete: deleteArchitectureDocumentComment,
          }}
          onClose={() => setDetail(null)}
        />
      )}
      {helpOpen && (
        <DialogFrame
          title="MyBatis Playbook"
          onClose={() => setHelpOpen(false)}
        >
          <p className="text-sm font-semibold leading-6 text-text-secondary">
            환경 설정, 빌드, 배포, 운영 과정을 1차 영역과 2차 주제 아래 여러
            Lexical 문서로 정리합니다.
          </p>
        </DialogFrame>
      )}
    </div>
  );
}

function Panel({
  className = "",
  title,
  count,
  placeholder,
  draft,
  onDraftChange,
  onSubmit,
  children,
}: {
  className?: string;
  title: string;
  count: number;
  placeholder: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit?: () => void;
  children: ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  function close() {
    onDraftChange("");
    setAdding(false);
  }
  function submit() {
    if (!draft.trim() || !onSubmit) return;
    onSubmit();
    setAdding(false);
  }
  return (
    <aside
      className={`flex min-h-0 flex-col rounded-md border border-surface-border bg-surface-raised shadow-sm ${className}`}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-surface-border px-4">
        <h2 className="text-sm font-black text-text-primary">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-surface-muted text-[11px] font-black text-text-muted">
            {count}
          </span>
          {onSubmit && (
            <button
              type="button"
              onClick={() => setAdding((current) => !current)}
              className="grid size-7 place-items-center rounded-md border border-brand-border bg-brand-glass text-brand-primary"
              title={adding ? "추가 닫기" : `${title} 추가`}
            >
              {adding ? <X className="size-4" /> : <Plus className="size-4" />}
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {children}
        {adding && onSubmit && (
          <div className="flex gap-2 rounded-md border border-dashed border-brand-border bg-brand-glass p-2">
            <input
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
                if (event.key === "Escape") close();
              }}
              placeholder={placeholder}
              className="ui-input h-9 min-w-0 flex-1 bg-surface-raised text-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="grid size-9 shrink-0 place-items-center rounded-md border border-brand-border bg-brand-glass text-brand-primary disabled:opacity-40"
              title="저장"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={close}
              className="ui-icon-button h-9 w-9 shrink-0"
              title="취소"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
function InlineTitleRow({
  title,
  number,
  depth = 0,
  active,
  icon,
  busy,
  onClick,
  onRowClick,
  onOpen,
  onAddChild,
  hasChildren,
  expanded,
  onToggle,
  onSave,
  onDelete,
  extraActions,
}: {
  title: string;
  number?: number;
  depth?: number;
  active?: boolean;
  icon?: boolean;
  busy: boolean;
  onClick?: () => void;
  onRowClick?: () => void;
  onOpen?: () => void;
  onAddChild?: () => void;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onSave: (nextTitle: string) => Promise<void>;
  onDelete: () => void;
  extraActions?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [editing, title]);

  function startEditing(event: MouseEvent) {
    event.stopPropagation();
    setDraft(title);
    setEditing(true);
  }
  function cancelEditing() {
    setDraft(title);
    setEditing(false);
  }
  async function submit() {
    const nextTitle = draft.trim();
    if (!nextTitle || saving || busy) return;
    if (nextTitle === title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(nextTitle);
      setEditing(false);
    } catch {
      /* 상위에서 오류 메시지를 표시한다. */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onRowClick && !editing && !busy ? onRowClick : undefined}
      style={{ marginLeft: `${depth * 28}px` }}
      className={`flex items-center gap-2 rounded-md p-2.5 ${active ? "bg-brand-glass" : "bg-surface-muted"} ${onRowClick ? "cursor-pointer" : ""}`}
    >
      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
              if (event.key === "Escape") cancelEditing();
            }}
            className="ui-input h-8 min-w-0 flex-1 bg-surface-raised px-2 text-sm font-bold"
            autoFocus
            disabled={saving || busy}
            aria-label="제목 수정"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!draft.trim() || saving || busy}
            className="grid size-8 shrink-0 place-items-center rounded-md border border-brand-border bg-brand-glass text-brand-primary disabled:opacity-40"
            title="저장"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={saving}
            className="ui-icon-button h-8 w-8 shrink-0"
            title="취소"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <>
          {onOpen ? (
            <div
              className="flex min-w-0 flex-1 items-center gap-2 p-1"
              onDoubleClick={startEditing}
              title="제목을 더블클릭하여 수정"
            >
              {number !== undefined && (
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-md border border-surface-border-soft bg-surface-raised text-[11px] font-black text-text-muted"
                  aria-label={`${number}번 문서`}
                >
                  {number}
                </span>
              )}
              {hasChildren && onToggle && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle();
                  }}
                  className="grid size-6 shrink-0 place-items-center rounded-md border border-surface-border-soft bg-surface-raised text-text-muted transition-colors hover:text-brand-primary"
                  title={expanded ? "하위 문서 접기" : "하위 문서 펼치기"}
                  aria-label={expanded ? "하위 문서 접기" : "하위 문서 펼치기"}
                >
                  <ChevronRight
                    className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                </button>
              )}
              {icon && (
                <FileText className="size-3.5 shrink-0 text-brand-primary" />
              )}
              {depth > 0 && (
                <span className="shrink-0 text-sm font-black text-brand-primary">
                  ㄴ
                </span>
              )}
              <span className="truncate text-sm font-black text-text-primary">
                {title}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClick}
              onDoubleClick={startEditing}
              title="제목을 더블클릭하여 수정"
              className="flex min-w-0 flex-1 items-center gap-2 p-1 text-left"
            >
              {number !== undefined && (
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-md border border-surface-border-soft bg-surface-raised text-[11px] font-black text-text-muted"
                  aria-label={`${number}번 항목`}
                >
                  {number}
                </span>
              )}
              {hasChildren && onToggle && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle();
                  }}
                  className="grid size-6 shrink-0 place-items-center rounded-md border border-surface-border-soft bg-surface-raised text-text-muted transition-colors hover:text-brand-primary"
                  title={expanded ? "하위 문서 접기" : "하위 문서 펼치기"}
                  aria-label={expanded ? "하위 문서 접기" : "하위 문서 펼치기"}
                >
                  <ChevronRight
                    className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                </button>
              )}
              {icon && (
                <FileText className="size-3.5 shrink-0 text-brand-primary" />
              )}
              {depth > 0 && (
                <span className="shrink-0 text-sm font-black text-brand-primary">
                  ㄴ
                </span>
              )}
              <span className="truncate text-sm font-black text-text-primary">
                {title}
              </span>
            </button>
          )}
          {onAddChild && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAddChild();
              }}
              disabled={busy}
              className="ui-icon-button h-8 w-8 shrink-0 text-brand-primary"
              title="하위 문서 추가"
            >
              <GitBranch className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={busy}
            className="ui-icon-button h-8 w-8 shrink-0 text-[var(--destructive)]"
            title="삭제"
          >
            <Trash2 className="size-3.5" />
          </button>
          {extraActions && (
            <div onClick={(event) => event.stopPropagation()}>{extraActions}</div>
          )}
          {onOpen && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
              disabled={busy}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-brand-border bg-brand-glass px-2.5 text-xs font-black text-brand-primary transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border/40 disabled:opacity-40"
              title="문서 열기"
            >
              <span>열기</span>
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
function TitleDialog({
  state,
  busy,
  onClose,
  onSave,
}: {
  state: TitleDialog;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DialogFrame
      title={`${state.kind === "category" ? "MyBatis 영역" : "MyBatis 주제"} 삭제`}
      onClose={onClose}
    >
      <p className="text-sm font-semibold text-text-secondary">
        이 항목을 삭제할까요?
      </p>
      <Actions busy={busy} deleting onClose={onClose} onSave={onSave} />
    </DialogFrame>
  );
}
function DocumentDialog({
  state,
  title,
  body,
  busy,
  onTitle,
  onBody,
  onClose,
  onSave,
}: {
  state: DocumentDialog;
  title: string;
  body: string;
  busy: boolean;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const deleting = state.mode === "delete";
  return (
    <DialogFrame
      contentClassName="flex min-h-0 flex-1 flex-col"
      size={deleting ? "default" : "wide"}
      title={
        deleting
          ? "Lexical 문서 삭제"
          : state.mode === "create" && state.parentId
            ? "하위 문서 추가"
            : `Lexical 문서 ${state.mode === "create" ? "추가" : "수정"}`
      }
      onClose={onClose}
    >
      {deleting ? (
        <p className="text-sm font-semibold text-text-secondary">
          이 문서를 삭제할까요?
        </p>
      ) : (
        <>
          {state.parentId && (
            <p className="mb-3 rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-xs font-bold text-brand-primary">
              상위 문서: {state.parentTitle ?? "선택한 문서"}
            </p>
          )}
          <label className="block text-xs font-black text-text-secondary">
            문서 제목
            <input
              value={title}
              onChange={(event) => onTitle(event.target.value)}
              className="ui-input mt-1 h-10 text-sm"
              autoFocus
            />
          </label>
          <div className="lexical-editor-frame mt-4 min-h-0 flex-1">
            <LexicalEditor
              initialState={body}
              onChange={onBody}
              minHeight="520px"
              height="min(680px, calc(100vh - 16rem))"
              scrollable
            />
          </div>
        </>
      )}
      <Actions
        busy={busy}
        deleting={deleting}
        onClose={onClose}
        onSave={onSave}
      />
    </DialogFrame>
  );
}
function Actions({
  busy,
  deleting,
  onClose,
  onSave,
}: {
  busy: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md px-3 py-2 text-xs font-black text-text-secondary"
      >
        취소
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-black text-text-on-brand ${deleting ? "bg-[var(--destructive)]" : "bg-brand-primary"}`}
      >
        {deleting ? (
          <Trash2 className="size-3.5" />
        ) : (
          <Save className="size-3.5" />
        )}
        {deleting ? "삭제" : "저장"}
      </button>
    </div>
  );
}
function DialogFrame({
  title,
  onClose,
  size = "default",
  contentClassName = "",
  children,
}: {
  title: string;
  onClose: () => void;
  size?: "default" | "wide";
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[color-mix(in_srgb,var(--background)_72%,transparent)] p-4">
      <div
        className={`flex max-h-[calc(100vh-2rem)] w-full ${size === "wide" ? "max-w-6xl" : "max-w-3xl"} flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-raised p-5 shadow-2xl`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button h-8 w-8 rounded-full"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className={`mt-5 min-h-0 ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
function DetailDialog({
  document,
  onClose,
  onEdit,
}: {
  document: ArchitecturePlaybookDocument;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[color-mix(in_srgb,var(--background)_72%,transparent)] p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-surface-border bg-surface-raised p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="truncate text-lg font-black text-text-primary">
            {document.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button h-8 w-8 rounded-full"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 min-h-0 overflow-y-auto rounded-md border border-surface-border-soft p-3">
          <LexicalEditor
            key={document.id}
            initialState={document.content}
            onChange={() => undefined}
            readOnly
            minHeight="480px"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-xs font-black text-text-secondary"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-2 text-xs font-black text-text-on-brand"
          >
            <Pencil className="size-3.5" />
            수정
          </button>
        </div>
      </div>
    </div>
  );
}

export default MybatisPlaybookModule;
