import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Check, Copy } from 'lucide-react';

interface MarkdownProps {
  content: string;
  className?: string;
}

// React-Markdown wrapper. Uses:
//   - remark-gfm: tables, task lists, strikethrough, autolinks
//   - rehype-slug: stable id attributes on headings (for TOC anchor links)
//   - rehype-autolink-headings: subtle anchor icon on h2/h3
//
// Code highlighting is done by rehype-pretty-code at build time, but we keep
// the runtime cost low by rendering it as plain text. A future iteration
// can add shiki/rehype-pretty-code for VSCode-quality highlighting.
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={`prose dark:prose-invert max-w-none ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['no-underline'] } }],
        ]}
        components={{
          a: ({ href, children, ...rest }) => {
            if (href?.startsWith('#')) {
              return <a href={href} {...rest}>{children}</a>;
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
          },
          pre: ({ children, ...rest }) => {
            // Pass through — rehype-pretty-code would wrap with figure if used.
            return <pre {...rest}>{children}</pre>;
          },
          code: ({ className: cls, children, ...rest }) => {
            const isBlock = cls?.startsWith('language-');
            if (isBlock) {
              const text = String(children).replace(/\n$/, '');
              return <CodeBlock code={text} lang={cls?.replace('language-', '') || ''} />;
            }
            return <code className={cls} {...rest}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group my-3">
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
        {lang && <span className="text-[10px] font-mono text-ink-muted bg-surface-2 px-1.5 py-0.5 rounded">{lang}</span>}
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-surface-2 hover:bg-surface-3 text-ink-muted"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <pre className="bg-code-bg border border-code-border rounded p-3 overflow-x-auto text-[12.5px] leading-relaxed font-mono">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
