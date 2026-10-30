import { useEffect, useRef, useState } from 'react';
import { FLEET_AGENT_QUESTIONS, type DataAgentResult } from '@rayfin-app/shared';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/fleet-controls';
import { centralDate, centralTime } from '@/lib/fleet';
import { askFleetAgent } from '@/services/agent.service';

type State = { kind: 'idle' } | { kind: 'loading'; question: string } |
  { kind: 'complete'; question: string; result: DataAgentResult } | { kind: 'error'; question: string };

export function FleetAgent({ asOf }: { asOf: Date }) {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [seconds, setSeconds] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const answer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (state.kind !== 'loading') return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state.kind]);
  useEffect(() => {
    if (state.kind === 'complete' || state.kind === 'error') answer.current?.focus();
  }, [state.kind]);
  const ask = async (value: string) => {
    if (busy.current || !value.trim() || value.length > 2000) return;
    busy.current = true;
    setSeconds(0);
    setState({ kind: 'loading', question: value.trim() });
    try {
      const result = await askFleetAgent(value.trim());
      if (mounted.current) setState({ kind: 'complete', question: value.trim(), result });
    } catch {
      console.error('[fleet-agent] Invocation failed; no prompt or provider detail logged.');
      if (mounted.current) setState({ kind: 'error', question: value.trim() });
    } finally {
      busy.current = false;
    }
  };
  const loading = state.kind === 'loading';
  return <section aria-labelledby="fleet-agent-title" className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex items-start gap-300 border-b border-border p-400">
      <MessageSquare className="icon-size-400 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">Investigate / understand / decide</p>
        <h2 id="fleet-agent-title" className="font-heading text-600 font-semibold">Ask the fleet</h2>
        <p className="text-200 text-muted-foreground">Fabric Data Agent / read-only / whole synthetic fleet, independent of map filters.</p>
      </div>
    </div>
    <div className="grid gap-500 p-400 lg:grid-cols-3">
      <aside className="space-y-300">
        <h3 className="text-300 font-semibold">Start an investigation</h3>
        <div className="flex flex-col items-start gap-200">
          {FLEET_AGENT_QUESTIONS.map((value) => <Button key={value} disabled={loading}
            className="w-full justify-start text-left text-200" onClick={() => { setQuestion(value); void ask(value); }}>{value}</Button>)}
        </div>
        <p className="text-200 text-muted-foreground">Scenario time: {centralDate(asOf)} / {centralTime(asOf)}. OneLake replication may lag the map&apos;s operational SQL source.</p>
      </aside>
      <div className="min-w-0 space-y-400 lg:col-span-2">
        <form onSubmit={(event) => { event.preventDefault(); void ask(question); }} className="space-y-200">
          <label htmlFor="fleet-question" className="block text-300 font-semibold">Your fleet question</label>
          <textarea id="fleet-question" value={question} onChange={(event) => setQuestion(event.target.value)}
            maxLength={2000} rows={3} disabled={loading} required aria-describedby="fleet-question-help"
            className="w-full resize-y rounded-md border border-input bg-background p-300 text-300 text-foreground disabled:opacity-60"
            placeholder="Compare operational exceptions across Texas regions..." />
          <div className="flex flex-wrap items-center justify-between gap-200">
            <p id="fleet-question-help" className="text-200 text-muted-foreground">{question.length.toLocaleString()} / 2,000 characters. Do not enter real or sensitive operational data.</p>
            <Button type="submit" disabled={loading || !question.trim()} className="border-primary bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="icon-size-200" aria-hidden="true" />Ask Fabric Data Agent
            </Button>
          </div>
        </form>
        <div aria-busy={loading}>
          {state.kind === 'idle' && <p className="rounded-lg border border-border bg-muted p-400 text-300 text-muted-foreground">Ask a question to query the governed fleet source. No prewritten answers or substitute results.</p>}
          {state.kind === 'loading' && <div role="status" className="rounded-lg border border-border bg-muted p-400 text-300">
            <p className="font-semibold">Querying Fabric Data Agent...</p>
            <p>{seconds}s elapsed. This request is limited to about four minutes. The map remains usable.</p>
          </div>}
          {(state.kind === 'complete' || state.kind === 'error') && <div ref={answer} tabIndex={-1}
            className="space-y-300 rounded-lg border border-border bg-muted p-400">
            <p className="text-200 font-semibold text-muted-foreground">QUESTION / {state.question}</p>
            {state.kind === 'error' ? <div role="alert">
              <h3 className="text-300 font-semibold text-destructive">Agent request could not be completed</h3>
              <p className="my-200 text-300">Check your app session and connection, then retry. No substitute answer is shown.</p>
              <Button onClick={() => void ask(state.question)}>Retry question</Button>
            </div> : state.result.kind === 'failure' ? <div role="alert">
              <h3 className="text-300 font-semibold text-destructive">No agent answer</h3>
              <p className="my-200 text-300">{state.result.message}</p>
              {state.result.retryable && <Button onClick={() => void ask(state.question)}>Retry question</Button>}
              <p className="mt-200 break-all font-monospace text-200 text-muted-foreground">Request {state.result.requestId} / {state.result.code}</p>
            </div> : <>
              <h3 className="text-300 font-semibold">Agent-generated analysis</h3>
              <div className="whitespace-pre-wrap break-words text-300" data-testid="agent-answer">{state.result.answer}</div>
              {state.result.truncated && <p role="status" className="text-200 text-warning">Answer shortened to 20,000 characters. Ask a narrower question for the remaining detail.</p>}
              <p className="break-all font-monospace text-200 text-muted-foreground">{(state.result.elapsedMs / 1000).toFixed(1)}s / Request {state.result.requestId}</p>
              <p className="text-200 text-muted-foreground">Generated analysis can be wrong. Check it against the map and source records before acting. This assistant cannot send alerts or change records.</p>
            </>}
          </div>}
        </div>
      </div>
    </div>
  </section>;
}
