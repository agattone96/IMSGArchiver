import { useMemo } from 'react';

type DiffSegment = {
    value: string;
    type: 'equal' | 'add' | 'remove';
};

type TextDiffRendererProps = {
    before: string;
    after: string;
};

const tokenize = (text: string) => {
    if (!text) return [];
    return text.match(/\S+\s*|\s+/g) ?? [];
};

const diffTokens = (before: string, after: string): DiffSegment[] => {
    const a = tokenize(before);
    const b = tokenize(after);
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

    for (let i = a.length - 1; i >= 0; i -= 1) {
        for (let j = b.length - 1; j >= 0; j -= 1) {
            if (a[i] === b[j]) {
                dp[i][j] = 1 + dp[i + 1][j + 1];
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    const result: DiffSegment[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            result.push({ type: 'equal', value: a[i] });
            i += 1;
            j += 1;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            result.push({ type: 'remove', value: a[i] });
            i += 1;
        } else {
            result.push({ type: 'add', value: b[j] });
            j += 1;
        }
    }

    while (i < a.length) {
        result.push({ type: 'remove', value: a[i] });
        i += 1;
    }

    while (j < b.length) {
        result.push({ type: 'add', value: b[j] });
        j += 1;
    }

    return result;
};

export function TextDiffRenderer({ before, after }: TextDiffRendererProps) {
    const segments = useMemo(() => diffTokens(before, after), [before, after]);

    return (
        <p className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">
            {segments.map((segment, idx) => {
                if (segment.type === 'add') {
                    return <ins key={`add-${idx}`} className="bg-emerald-500/20 rounded px-0.5 no-underline">{segment.value}</ins>;
                }
                if (segment.type === 'remove') {
                    return <del key={`del-${idx}`} className="bg-rose-500/20 rounded px-0.5">{segment.value}</del>;
                }
                return <span key={`eq-${idx}`}>{segment.value}</span>;
            })}
        </p>
    );
}
