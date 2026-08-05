import { apiRequest, getToken } from "../../shared/api/client";

// The widget is shared with the Architecture Playbook UI, but this app is backed by
// the isolated MyBatis Playbook module and tables.
export type ArchitecturePlaybookDocument = { id: string; topicId: string; parentId?: string | null; title: string; content: string; orderIdx: number; createdAt: string; updatedAt: string };
export type ArchitecturePlaybookDocumentComment = { id: string; documentId: string; userId: string; parentId?: string | null; title: string; content: string; createdAt: string; updatedAt: string; authorName: string; isMine: boolean };
export type ArchitecturePlaybookTopic = { id: string; categoryId: string; title: string; orderIdx: number; createdAt: string; updatedAt: string; documents: ArchitecturePlaybookDocument[] };
export type ArchitecturePlaybookCategory = { id: string; userId: string; title: string; orderIdx: number; createdAt: string; updatedAt: string; topics: ArchitecturePlaybookTopic[] };

const token = () => getToken();
const request = <T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) => apiRequest<T>(path, { ...options, token: token() });
export function listArchitecturePlaybook() { return request<ArchitecturePlaybookCategory[]>("/mybatis-playbook", { errorMessage: "MyBatis 플레이북을 불러오지 못했습니다." }); }
export function createArchitectureCategory(title: string) { return request<ArchitecturePlaybookCategory | undefined>("/mybatis-playbook/categories", { method: "POST", body: { title }, errorMessage: "MyBatis 영역을 만들지 못했습니다." }); }
export function updateArchitectureCategory(id: string, title: string) { return request<ArchitecturePlaybookCategory | undefined>(`/mybatis-playbook/categories/${id}`, { method: "PATCH", body: { title }, errorMessage: "MyBatis 영역을 수정하지 못했습니다." }); }
export function deleteArchitectureCategory(id: string) { return request<{ success: boolean }>(`/mybatis-playbook/categories/${id}`, { method: "DELETE", errorMessage: "MyBatis 영역을 삭제하지 못했습니다." }); }
export function createArchitectureTopic(categoryId: string, title: string) { return request<ArchitecturePlaybookCategory | undefined>(`/mybatis-playbook/categories/${categoryId}/topics`, { method: "POST", body: { title }, errorMessage: "MyBatis 주제를 만들지 못했습니다." }); }
export function updateArchitectureTopic(id: string, title: string) { return request<ArchitecturePlaybookCategory | undefined>(`/mybatis-playbook/topics/${id}`, { method: "PATCH", body: { title }, errorMessage: "MyBatis 주제를 수정하지 못했습니다." }); }
export function deleteArchitectureTopic(id: string) { return request<{ success: boolean }>(`/mybatis-playbook/topics/${id}`, { method: "DELETE", errorMessage: "MyBatis 주제를 삭제하지 못했습니다." }); }
export function createArchitectureDocument(topicId: string, body: { title: string; content: string; parentId?: string | null }) { return request<ArchitecturePlaybookCategory | undefined>(`/mybatis-playbook/topics/${topicId}/documents`, { method: "POST", body, errorMessage: "MyBatis 문서를 만들지 못했습니다." }); }
export function updateArchitectureDocument(id: string, body: { title?: string; content?: string; parentId?: string | null }) { return request<ArchitecturePlaybookCategory | undefined>(`/mybatis-playbook/documents/${id}`, { method: "PATCH", body, errorMessage: "MyBatis 문서를 저장하지 못했습니다." }); }
export function deleteArchitectureDocument(id: string) { return request<{ success: boolean }>(`/mybatis-playbook/documents/${id}`, { method: "DELETE", errorMessage: "MyBatis 문서를 삭제하지 못했습니다." }); }
export function moveArchitectureDocument(id: string, direction: "up" | "down") { return request<ArchitecturePlaybookCategory[]>(`/mybatis-playbook/documents/${id}/reorder`, { method: "POST", body: { direction }, errorMessage: "MyBatis 문서 순서를 바꾸지 못했습니다." }); }
export function listArchitectureDocumentComments(documentId: string) { return request<ArchitecturePlaybookDocumentComment[]>(`/mybatis-playbook/documents/${documentId}/comments`, { errorMessage: "문서 댓글을 불러오지 못했습니다." }); }
export function createArchitectureDocumentComment(documentId: string, body: { title?: string; content: string; parentId?: string }) { return request<ArchitecturePlaybookDocumentComment[]>(`/mybatis-playbook/documents/${documentId}/comments`, { method: "POST", body, errorMessage: "문서 댓글을 등록하지 못했습니다." }); }
export function updateArchitectureDocumentComment(id: string, body: { title?: string; content: string }) { return request<ArchitecturePlaybookDocumentComment[]>(`/mybatis-playbook/comments/${id}`, { method: "PATCH", body, errorMessage: "문서 댓글을 수정하지 못했습니다." }); }
export function deleteArchitectureDocumentComment(id: string) { return request<{ success: boolean }>(`/mybatis-playbook/comments/${id}`, { method: "DELETE", errorMessage: "문서 댓글을 삭제하지 못했습니다." }); }
