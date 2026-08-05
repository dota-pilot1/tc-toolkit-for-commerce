import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Pencil,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LexicalEditor } from "./lexical/lexical-editor";

type DrawerDocument = { id: string; title: string; content: string };
export type DocumentComment = {
  id: string;
  documentId?: string;
  userId?: string;
  parentId?: string | null;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  authorName?: string;
  isMine?: boolean;
};

export type DocumentCommentApi = {
  list: (documentId: string) => Promise<DocumentComment[]>;
  create: (
    documentId: string,
    body: { title?: string; content: string; parentId?: string },
  ) => Promise<DocumentComment[]>;
  update: (commentId: string, body: { content: string }) => Promise<DocumentComment[]>;
  delete: (commentId: string) => Promise<unknown>;
};

function storageKey(documentId: string) {
  return `playbook-document-comments:${documentId}`;
}

function CommentContent({ content }: { content: string }) {
  let isLexical = false;
  try {
    isLexical = Boolean(JSON.parse(content)?.root);
  } catch {
    isLexical = false;
  }

  if (isLexical) {
    return (
      <div className="rounded-md border border-surface-border-soft bg-surface-raised">
        <LexicalEditor
          key={content}
          initialState={content}
          onChange={() => undefined}
          readOnly
          minHeight="40px"
        />
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-text-secondary">
      {content}
    </p>
  );
}

export default function DocumentDrawer({
  document,
  previous,
  next,
  onNavigate,
  onEdit,
  onDelete,
  commentApi,
  onClose,
}: {
  document: DrawerDocument;
  previous?: DrawerDocument;
  next?: DrawerDocument;
  onNavigate: (document: DrawerDocument) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  commentApi?: DocumentCommentApi;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setDraft("");
    setDraftTitle("");
    setReplyTo(null);
    setReplyDraft("");
    setEditingCommentId(null);
    setEditingDraft("");
    setCommentError("");

    if (!commentApi) {
      try {
        setComments(
          JSON.parse(
            window.localStorage.getItem(storageKey(document.id)) ?? "[]",
          ),
        );
      } catch {
        setComments([]);
      }
      return;
    }

    setCommentBusy(true);
    void commentApi
      .list(document.id)
      .then((nextComments) => {
        if (!cancelled) setComments(nextComments);
      })
      .catch(() => {
        if (!cancelled) {
          setComments([]);
          setCommentError("댓글을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setCommentBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [commentApi, document.id]);

  function persist(nextComments: DocumentComment[]) {
    setComments(nextComments);
    window.localStorage.setItem(
      storageKey(document.id),
      JSON.stringify(nextComments),
    );
  }

  async function addComment(parentId?: string) {
    const content = (parentId ? replyDraft : draft).trim();
    const title = parentId ? "답글" : draftTitle.trim();
    if (!content || (!parentId && !title) || commentBusy) return;

    setCommentBusy(true);
    setCommentError("");
    try {
      if (commentApi) {
        setComments(
          await commentApi.create(document.id, {
            title,
            content,
            ...(parentId ? { parentId } : {}),
          }),
        );
      } else {
        persist([
          ...comments,
          {
            id: crypto.randomUUID(),
            parentId,
            title,
            content,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      if (parentId) {
        setReplyDraft("");
        setReplyTo(null);
      } else {
        setDraftTitle("");
        setDraft("");
      }
    } catch {
      setCommentError("댓글을 등록하지 못했습니다.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!commentApi || commentBusy) return;
    setCommentBusy(true);
    setCommentError("");
    try {
      await commentApi.delete(commentId);
      setComments(await commentApi.list(document.id));
    } catch {
      setCommentError("댓글을 삭제하지 못했습니다.");
    } finally {
      setCommentBusy(false);
    }
  }

  function beginEdit(comment: DocumentComment) {
    if (commentApi && !comment.isMine) return;
    setEditingCommentId(comment.id);
    setEditingDraft(comment.content);
    setCommentError("");
  }

  function cancelEdit() {
    setEditingCommentId(null);
    setEditingDraft("");
  }

  async function updateComment(commentId: string) {
    const content = editingDraft.trim();
    if (!content || commentBusy) return;
    setCommentBusy(true);
    setCommentError("");
    try {
      if (commentApi) {
        setComments(await commentApi.update(commentId, { content }));
      } else {
        persist(
          comments.map((comment) =>
            comment.id === commentId ? { ...comment, content } : comment,
          ),
        );
      }
      cancelEdit();
    } catch {
      setCommentError("댓글을 수정하지 못했습니다.");
    } finally {
      setCommentBusy(false);
    }
  }

  const roots = comments.filter((comment) => !comment.parentId);

  return (
    <div className="fixed inset-0 z-[60] isolate bg-[color-mix(in_srgb,var(--background)_84%,transparent)]">
      <button
        type="button"
        aria-label="드로워 닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[820px] flex-col border-l border-surface-border bg-surface-raised shadow-2xl">
        <header className="flex items-center gap-2 border-b border-surface-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-primary">
              문서 보기
            </p>
            <h2 className="truncate text-lg font-black text-text-primary">
              {document.title}
            </h2>
          </div>
          {(previous || next) && (
            <nav
              className="flex shrink-0 items-center gap-2 border-l border-surface-border-soft pl-4"
              aria-label="문서 이동"
            >
              {previous && (
                <button
                  type="button"
                  onClick={() => onNavigate(previous)}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-surface-border px-2.5 text-xs font-black text-text-secondary hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
                  title="이전 문서"
                >
                  <ChevronLeft className="size-4" />
                  이전
                </button>
              )}
              {next && (
                <button
                  type="button"
                  onClick={() => onNavigate(next)}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-surface-border px-2.5 text-xs font-black text-text-secondary hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
                  title="다음 문서"
                >
                  다음
                  <ChevronRight className="size-4" />
                </button>
              )}
            </nav>
          )}
          {(onEdit || onDelete) && (
            <div
              className="flex shrink-0 items-center gap-2 border-l border-surface-border-soft pl-4"
              aria-label="문서 작업"
            >
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-2.5 text-xs font-black text-brand-primary hover:bg-surface-raised"
                  title="문서 수정"
                >
                  <Pencil className="size-3.5" />
                  수정
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--destructive)]/30 px-2.5 text-xs font-black text-[var(--destructive)] hover:bg-danger-glass"
                  title="문서 삭제"
                >
                  <Trash2 className="size-3.5" />
                  삭제
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button ml-2 h-9 w-9 shrink-0"
            title="닫기"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-md border border-surface-border-soft p-4">
            <LexicalEditor
              key={document.id}
              initialState={document.content}
              onChange={() => undefined}
              readOnly
              minHeight="360px"
            />
          </div>

          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-black text-text-primary">
              <MessageCircle className="size-4 text-brand-primary" />
              댓글·대댓글
              <span className="grid min-w-6 place-items-center rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] text-text-muted">
                {comments.length}
              </span>
            </h3>

            {commentError && (
              <p className="mt-2 text-xs font-semibold text-[var(--destructive)]">
                {commentError}
              </p>
            )}

            <div className="mt-3 space-y-2">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="댓글 제목을 입력하세요."
                className="ui-input h-9 w-full text-sm"
              />
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="댓글 내용을 입력하세요."
                rows={4}
                className="ui-input min-h-28 w-full resize-y py-2 text-sm"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void addComment()}
                  disabled={!draftTitle.trim() || !draft.trim() || commentBusy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-primary px-3 text-xs font-black text-text-on-brand disabled:opacity-40"
                >
                  <Send className="size-3.5" />
                  댓글 등록
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {commentBusy && !comments.length ? (
                <p className="text-xs font-semibold text-text-muted">
                  댓글을 불러오는 중입니다.
                </p>
              ) : (
                roots.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-lg border border-surface-border-soft bg-surface-muted p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 text-[11px] font-black text-brand-primary">
                          {comment.authorName ?? "익명"}
                        </div>
                        <p className="mb-1 text-sm font-black text-text-primary">
                          {comment.title ?? "댓글"}
                        </p>
                        <CommentContent content={comment.content} />
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        <span className="text-[10px] font-semibold text-text-muted">
                          {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                        {commentApi && comment.isMine && (
                          <button
                            type="button"
                            onClick={() => void deleteComment(comment.id)}
                            disabled={commentBusy}
                            className="text-[10px] font-black text-[var(--destructive)] disabled:opacity-40"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo(replyTo === comment.id ? null : comment.id)
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-2.5 py-1.5 text-xs font-black text-text-secondary hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
                      >
                        <Reply className="size-3.5" />
                        답글 달기
                      </button>
                    </div>

                    {replyTo === comment.id && (
                      <div className="mt-3 rounded-md border border-brand-border bg-brand-glass p-3">
                        <textarea
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder="대댓글을 남겨보세요."
                          rows={2}
                          className="ui-input min-h-14 w-full bg-surface-raised py-2 text-xs"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void addComment(comment.id)}
                            disabled={!replyDraft.trim() || commentBusy}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-brand-primary px-2.5 text-[11px] font-black text-text-on-brand disabled:opacity-40"
                          >
                            <Send className="size-3" />
                            답글 등록
                          </button>
                        </div>
                      </div>
                    )}

                    {comments
                      .filter((reply) => reply.parentId === comment.id)
                      .map((reply) => (
                        <div key={reply.id} className="mt-3 ml-6">
                          <div className="rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2.5 text-sm font-semibold leading-6 text-text-secondary">
                            <div className="mb-1 flex items-center justify-between text-[10px] font-black text-brand-primary">
                              <span>ㄴ {reply.authorName ?? "익명"}</span>
                              {commentApi && reply.isMine && (
                                <button
                                  type="button"
                                  onClick={() => void deleteComment(reply.id)}
                                  disabled={commentBusy}
                                  className="font-black text-[var(--destructive)] disabled:opacity-40"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                            <p className="mb-1 text-xs font-black text-text-primary">
                              {reply.title ?? "답글"}
                            </p>
                            <CommentContent content={reply.content} />
                          </div>
                        </div>
                      ))}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
