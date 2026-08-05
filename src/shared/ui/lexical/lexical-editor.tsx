import { useCallback, useEffect, useMemo } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { ORDERED_LIST, TRANSFORMERS } from '@lexical/markdown'
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $isListItemNode, $isListNode, ListNode, ListItemNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
  type EditorState,
} from 'lexical'
import { $findMatchingParent } from '@lexical/utils'
import { $isCodeNode } from '@lexical/code'
import { editorTheme } from './theme'
import { LexicalToolbar } from './toolbar'
import { ImageNode } from './nodes/image-node'
import { YoutubeNode } from './nodes/youtube-node'
import { MermaidNode, $createMermaidNode } from './nodes/mermaid-node'
import { DragDropImagePlugin, ImagePlugin } from './plugins/image-plugin'
import { YoutubePlugin } from './plugins/youtube-plugin'
import { TableActionMenuPlugin } from './plugins/table-action-plugin'
import { uploadImageToS3 } from './utils/upload-image'

type LexicalEditorProps = {
  initialState?: string
  onChange: (state: string) => void
  placeholder?: string
  minHeight?: string
  height?: string
  scrollable?: boolean
  readOnly?: boolean
  toolbarVariant?: 'full' | 'simple'
}

// Number prefixes such as `1. ` remain plain text while typing.
// Numbered lists are still available through the toolbar button.
const MARKDOWN_TRANSFORMERS = TRANSFORMERS.filter(
  (transformer) => transformer !== ORDERED_LIST,
)

function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => registerCodeHighlighting(editor), [editor])
  return null
}

function CodeBlockBackspacePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false

          const anchorNode = selection.anchor.getNode()
          const codeNode = $isCodeNode(anchorNode)
            ? anchorNode
            : $findMatchingParent(anchorNode, $isCodeNode)

          if (!codeNode || !codeNode.isEmpty()) return false

          event.preventDefault()
          editor.update(() => {
            const paragraph = $createParagraphNode()
            codeNode.replace(paragraph)
            paragraph.select()
          })
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor],
  )

  return null
}

function CodeBlockMergePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      editor.registerNodeTransform(CodeNode, (codeNode) => {
        const nextNode = codeNode.getNextSibling()
        if (!$isCodeNode(nextNode) || codeNode.getLanguage() !== nextNode.getLanguage()) {
          return
        }

        const nextChildren = nextNode.getChildren()
        codeNode.append($createTextNode('\n'), ...nextChildren)
        nextNode.remove()
      }),
    [editor],
  )

  return null
}

function MermaidCodeNodeTransformPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      editor.registerNodeTransform(CodeNode, (codeNode) => {
        const source = codeNode.getTextContent().trim()
        const language = codeNode.getLanguage()?.toLowerCase()
        if (
          !source ||
          (language !== 'mermaid' && language !== 'mmd' && !isMermaidSource(source))
        ) {
          return
        }

        codeNode.replace($createMermaidNode({ source }))
      }),
    [editor],
  )

  return null
}

function OrderedListBackspacePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false

          const anchorNode = selection.anchor.getNode()
          const listItem = $findMatchingParent(anchorNode, $isListItemNode)
          const listNode = listItem?.getParent()
          if (!listItem || !$isListNode(listNode) || listNode.getListType() !== 'number') {
            return false
          }

          const firstChild = listItem.getFirstChild()
          const firstDescendant = listItem.getFirstDescendant()
          const atStart =
            (firstDescendant?.is(anchorNode) && selection.anchor.offset === 0) ||
            (firstChild?.is(anchorNode) && selection.anchor.offset === 0) ||
            (listItem.is(anchorNode) && selection.anchor.offset === 0)
          if (!atStart || !firstChild) return false

          event.preventDefault()
          const paragraph = $createParagraphNode()
          listItem.getChildren().forEach((child) => paragraph.append(child))
          if (listNode.getChildrenSize() === 1) {
            listNode.replace(paragraph)
          } else {
            listNode.insertBefore(paragraph, listItem)
            listItem.remove()
          }
          paragraph.selectStart()
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor],
  )

  return null
}

function EditablePlugin({ readOnly }: { readOnly: boolean }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(!readOnly)
  }, [editor, readOnly])
  return null
}

function isValidLexicalJson(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return Boolean(parsed?.root)
  } catch {
    return false
  }
}

function isMermaidSource(source: string): boolean {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|architecture-beta|block-beta)\b/.test(
    source.trim(),
  )
}

export function LexicalEditor({
  initialState,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '200px',
  height,
  scrollable = false,
  readOnly = false,
  toolbarVariant = 'full',
}: LexicalEditorProps) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      const serialized = JSON.stringify(editorState.toJSON())
      onChange(serialized)
    },
    [onChange],
  )

  const initialConfig = useMemo(
    () => ({
      namespace: 'DocuNoteEditor',
      theme: editorTheme,
      editable: !readOnly,
      editorState:
        initialState && isValidLexicalJson(initialState) ? initialState : undefined,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        CodeNode,
        CodeHighlightNode,
        LinkNode,
        HorizontalRuleNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        ImageNode,
        YoutubeNode,
        MermaidNode,
      ],
      onError: (error: Error) => {
        console.error('Lexical error:', error)
      },
    }),
    // initialState is only used as the mount seed; block remount churn while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readOnly],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={`lexical-editor flex min-h-0 flex-col bg-surface-raised ${readOnly ? 'lexical-editor-readonly' : ''}`}
        style={height ? { height } : undefined}
      >
        {readOnly ? null : (
          <LexicalToolbar
            onImageUpload={toolbarVariant === 'full' ? uploadImageToS3 : undefined}
            variant={toolbarVariant}
          />
        )}
        <div
          className={`lexical-editor-content relative ${scrollable ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="lexical-editor-input px-6 py-6 text-[15px] leading-7 text-text-primary outline-none"
                style={{ minHeight }}
              />
            }
            placeholder={
              readOnly ? null : (
                <div className="lexical-editor-placeholder pointer-events-none absolute left-6 top-5 text-[15px] text-text-muted">
                  {placeholder}
                </div>
              )
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        {readOnly ? null : <HistoryPlugin />}
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <HorizontalRulePlugin />
        <TablePlugin hasHorizontalScroll />
        <CodeHighlightPlugin />
        {!readOnly ? <CodeBlockBackspacePlugin /> : null}
        {!readOnly ? <CodeBlockMergePlugin /> : null}
        <MermaidCodeNodeTransformPlugin />
        {!readOnly ? <OrderedListBackspacePlugin /> : null}
        {readOnly ? null : <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />}
        {readOnly ? null : <ImagePlugin />}
        {readOnly ? null : <DragDropImagePlugin onUpload={uploadImageToS3} />}
        {readOnly ? null : <YoutubePlugin />}
        {readOnly ? null : <TableActionMenuPlugin />}
        <OnChangePlugin onChange={handleChange} />
        <EditablePlugin readOnly={readOnly} />
      </div>
    </LexicalComposer>
  )
}
