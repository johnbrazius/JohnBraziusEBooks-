import ReactMarkdown from "react-markdown";

/** Renders admin-authored Markdown. Raw HTML is NOT rendered (react-markdown escapes it by default). */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`prose prose-slate max-w-none prose-headings:font-display prose-headings:text-navy-900 prose-a:text-teal-700 ${className}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} rel={href?.startsWith("http") ? "noopener noreferrer nofollow" : undefined}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
