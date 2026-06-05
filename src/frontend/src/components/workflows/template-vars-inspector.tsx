import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import type {
  TemplateVarDescriptor,
  TemplateVarsResponse,
} from '@/types/template-vars';

interface TemplateVarsInspectorProps {
  // Trigger type slug (e.g. ``on_request_access``). When unset the
  // inspector renders a hint asking the author to pick a trigger first.
  triggerType?: string;
  // Entity type slug (e.g. ``data_product``). When the trigger declares
  // multiple entity types this should be the one the author wants
  // templates to resolve against; ``workflow-designer.tsx`` defaults to
  // the first entry in ``trigger.entity_types``.
  entityType?: string;
}

// Compact preview for a sample value. Lists/objects render as compact
// JSON so the chip stays single-line; long previews are truncated with
// the full payload available on hover via the native ``title`` attr.
function formatSample(sample: unknown): string {
  if (sample === null || sample === undefined) {
    return '';
  }
  if (typeof sample === 'string') {
    return sample;
  }
  try {
    return JSON.stringify(sample);
  } catch {
    return String(sample);
  }
}

function truncate(value: string, max = 60): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

function VariableRow({ descriptor }: { descriptor: TemplateVarDescriptor }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const placeholder = `\${${descriptor.path}}`;
  const sample = formatSample(descriptor.sample);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(placeholder);
      setCopied(true);
      toast({
        title: 'Copied',
        description: `${placeholder} copied to clipboard.`,
      });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Browser blocked clipboard access.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {placeholder}
          </code>
          <Badge variant="outline" className="text-xs">
            {descriptor.type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {descriptor.description}
        </p>
        {sample && (
          <p
            className="text-xs text-muted-foreground/80 mt-0.5 font-mono truncate"
            title={sample}
          >
            e.g. {truncate(sample)}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        aria-label={`Copy ${placeholder}`}
        className="shrink-0 h-7 w-7 p-0"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export default function TemplateVarsInspector({
  triggerType,
  entityType,
}: TemplateVarsInspectorProps) {
  const { get } = useApi();
  const [data, setData] = useState<TemplateVarsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!triggerType || !entityType) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/workflows/template-vars?trigger=${encodeURIComponent(
      triggerType,
    )}&entity_type=${encodeURIComponent(entityType)}`;
    get<TemplateVarsResponse>(url)
      .then((response) => {
        if (cancelled) return;
        if (response.error) {
          setError(response.error);
          setData(null);
        } else {
          setData(response.data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load variables');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [triggerType, entityType, get]);

  if (!triggerType || !entityType) {
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Pick a trigger and entity type to see the variables available for{' '}
          <code className="font-mono">{'${...}'}</code> substitution.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground">Loading variables…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs text-destructive">Failed to load variables: {error}</p>
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground">
          No variable descriptors are registered for this trigger and
          entity type yet. You can still use the universal placeholders
          ({' '}
          <code className="font-mono">{'${entity_name}'}</code>,{' '}
          <code className="font-mono">{'${user_email}'}</code>, etc.).
        </p>
      </div>
    );
  }

  // Default-open the entity group (first) since that's the most useful.
  const defaultOpen = data.groups[0]?.namespace;

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30">
        <p className="text-xs font-medium">Available variables</p>
        <p className="text-xs text-muted-foreground">
          Click the copy icon to grab a placeholder.
        </p>
      </div>
      <Accordion type="multiple" defaultValue={defaultOpen ? [defaultOpen] : []}>
        {data.groups.map((group) => (
          <AccordionItem
            key={group.namespace}
            value={group.namespace}
            className="border-b last:border-b-0"
          >
            <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
              <span>
                {group.namespace}
                <span className="ml-2 text-muted-foreground font-normal">
                  ({group.variables.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-2 pt-0">
              <p className="text-xs text-muted-foreground mb-1">
                {group.description}
              </p>
              <div>
                {group.variables.map((variable) => (
                  <VariableRow key={variable.path} descriptor={variable} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
