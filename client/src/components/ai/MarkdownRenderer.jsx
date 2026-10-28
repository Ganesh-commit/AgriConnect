import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CheckCircle2, ArrowUpRight, Package } from 'lucide-react';

const apiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
const fallbackCropImage = `${apiOrigin}/public/placeholder-crop.jpg`;

function resolveCardImageUrl(img) {
  if (!img) return fallbackCropImage;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
    return img;
  }
  return img.startsWith('/') ? `${apiOrigin}${img}` : `${apiOrigin}/${img}`;
}

/**
 * Parses inline markdown syntax: **bold**, *italic*, `code`, and [label](url).
 */
function renderInlineMarkdown(text) {
  if (!text) return null;
  const tokens = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={match.index} className="font-extrabold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={match.index} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-emerald-800 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isInternal = href.startsWith('/');
        tokens.push(
          isInternal ? (
            <Link
              key={match.index}
              to={href}
              className="text-emerald-700 font-bold underline hover:text-emerald-800"
            >
              {label}
            </Link>
          ) : (
            <a
              key={match.index}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-bold underline hover:text-emerald-800"
            >
              {label}
            </a>
          )
        );
      } else {
        tokens.push(token);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

/**
 * Rich Markdown renderer supporting GFM tables, headings, bullet/numbered lists,
 * blockquotes, code blocks, and inline formatting (`react-markdown` compatible).
 */
export function MarkdownRenderer({ content, children, compact = false }) {
  const raw = String(content ?? children ?? '');
  if (!raw.trim()) return null;

  const lines = raw.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Markdown Table block (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (nextTrimmed.startsWith('|') && /[-:]{2,}/.test(nextTrimmed)) {
        const parseRow = (r) =>
          r
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim());

        const headers = parseRow(trimmed);
        i += 2; // skip header + separator
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(parseRow(lines[i]));
          i++;
        }

        elements.push(
          <div
            key={`table-${i}`}
            className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-50/80 border-b border-slate-200 text-emerald-950">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-2.5 py-2 font-extrabold whitespace-nowrap">
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1.5 text-slate-700 align-top">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Headings (###, ##, #)
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${i}`}
          className={`${
            compact ? 'text-xs' : 'text-sm'
          } font-extrabold text-emerald-950 mt-2.5 mb-1`}
        >
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${i}`}
          className={`${
            compact ? 'text-xs' : 'text-sm'
          } font-extrabold text-emerald-950 mt-2.5 mb-1`}
        >
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={`h1-${i}`}
          className={`${
            compact ? 'text-sm' : 'text-base'
          } font-extrabold text-emerald-950 mt-2.5 mb-1`}
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // 3. Blockquote (> )
    if (trimmed.startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 pl-3 py-1.5 border-l-3 border-emerald-600 bg-emerald-50/60 rounded-r-xl text-slate-700 text-xs"
        >
          {renderInlineMarkdown(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // 4. Unordered List (- or * )
    if (/^[-*•]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1.5 pl-4 list-disc space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-slate-700 leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Ordered List (1. 2. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1.5 pl-4 list-decimal space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-slate-700 leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 6. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 text-slate-800 leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Renders clickable live marketplace crop cards returned in `cards` from tool calls.
 */
export function ChatCropCards({ cards = [], compact = false, onCardClick }) {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  return (
    <div className="mt-2.5 w-full">
      <div
        className={`grid gap-2.5 ${
          compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {cards.map((card) => {
          const imgSrc = resolveCardImageUrl(card.imageUrl);
          const locationText = [card.location?.district, card.location?.state]
            .filter(Boolean)
            .join(', ');

          const tierBadgeColor =
            card.priceTier === 'low'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : card.priceTier === 'high'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-sky-100 text-sky-800 border-sky-200';

          return (
            <Link
              key={card.id}
              to={card.cropUrl || `/crops/${card.id}`}
              onClick={onCardClick}
              className="group flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition-all text-left"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                <img
                  src={imgSrc}
                  alt={card.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackCropImage;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-xs font-extrabold text-slate-900 truncate group-hover:text-emerald-700">
                    {card.name}
                  </h4>
                  <ArrowUpRight
                    size={13}
                    className="text-slate-400 group-hover:text-emerald-600 shrink-0"
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs font-black text-emerald-700">
                    ₹{card.pricePerUnit}/{card.unit}
                  </span>
                  {card.priceTier && (
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md border ${tierBadgeColor}`}
                    >
                      {card.priceTier} tier
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 truncate">
                  <span className="inline-flex items-center gap-0.5 font-semibold text-slate-600">
                    <Package size={10} className="text-emerald-600" />
                    {card.quantityAvailable} {card.unit}
                  </span>
                  {locationText && (
                    <span className="inline-flex items-center gap-0.5 truncate">
                      <MapPin size={10} className="text-slate-400 shrink-0" />
                      {locationText}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                  <span className="truncate">{card.farmerName}</span>
                  {card.verified && (
                    <span className="inline-flex items-center gap-0.5 text-blue-600 font-bold shrink-0">
                      <CheckCircle2 size={10} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default MarkdownRenderer;
