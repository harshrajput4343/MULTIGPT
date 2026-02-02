import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  let codeBlockIndex = 0;

  // Clean up content - convert <br> tags to newlines, normalize line breaks
  const cleanContent = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const currentIndex = codeBlockIndex++;

            if (match) {
              return (
                <div style={{ position: 'relative', margin: '1rem 0' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#1e1e1e',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem 0.5rem 0 0',
                    fontSize: '0.75rem',
                    color: '#888'
                  }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{match[1]}</span>
                    <button
                      onClick={() => handleCopy(codeString, currentIndex)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#888',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      {copiedIndex === currentIndex ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                      {copiedIndex === currentIndex ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={oneDark as { [key: string]: React.CSSProperties }}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem' }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code
                className={className}
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.9em',
                  color: '#c7d2fe',
                  fontFamily: 'monospace'
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p style={{ marginBottom: '1.25rem', lineHeight: '1.8' }}>{children}</p>;
          },
          ul({ children }) {
            return <ul style={{ paddingLeft: '1.75rem', marginBottom: '1.5rem', listStyleType: 'disc' }}>{children}</ul>;
          },
          ol({ children }) {
            return <ol style={{ paddingLeft: '1.75rem', marginBottom: '1.5rem', listStyleType: 'decimal' }}>{children}</ol>;
          },
          li({ children }) {
            return <li style={{ marginBottom: '0.75rem', lineHeight: '1.7', paddingLeft: '0.25rem' }}>{children}</li>;
          },
          h1({ children }) {
            return <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '2rem', marginBottom: '1rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{children}</h1>;
          },
          h2({ children }) {
            return <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '1.75rem', marginBottom: '1rem', color: '#fff' }}>{children}</h2>;
          },
          h3({ children }) {
            return <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', color: '#e2e8f0' }}>{children}</h3>;
          },
          h4({ children }) {
            return <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.75rem', color: '#cbd5e1' }}>{children}</h4>;
          },
          blockquote({ children }) {
            return (
              <blockquote style={{
                borderLeft: '4px solid var(--primary)',
                paddingLeft: '1rem',
                marginLeft: 0,
                marginBottom: '1rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '0.75rem 1rem',
                borderRadius: '0 0.5rem 0.5rem 0'
              }}>
                {children}
              </blockquote>
            );
          },
          strong({ children }) {
            return <strong style={{ fontWeight: 700, color: '#fff' }}>{children}</strong>;
          },
          em({ children }) {
            return <em style={{ fontStyle: 'italic', color: '#c7d2fe' }}>{children}</em>;
          },
          hr() {
            return <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />;
          },
          table({ children }) {
            return (
              <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return <th style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>{children}</th>;
          },
          td({ children }) {
            return <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>{children}</td>;
          },
          a({ children, href }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{children}</a>;
          }
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};

