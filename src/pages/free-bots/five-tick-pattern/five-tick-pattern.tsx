import React, { useCallback, useEffect, useRef, useState } from 'react';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useStore } from '@/hooks/useStore';
import { Localize, localize } from '@deriv-com/translations';

const ASSETS = ['R_25', 'R_100'];
const ASSET_NAMES: Record<string, string> = { R_25: 'V25', R_100: 'V100' };
const CFG_STAKE = 0.35;
const CFG_MART = 2;
const CFG_STEPS = 3;
const PROPOSAL_TTL = 800;
const TICK_HISTORY_MAX = 20;

type TStatus = 'idle' | 'scanning' | 'trading';

type TContractUpdate = {
    contract_id: number;
    profit: string;
    buy_price: string;
    is_expired: number;
    is_sold: number;
    contract_type: string;
    entry_tick: number;
    exit_tick: number;
};

type TTradeRow = {
    time: string;
    asset: string;
    type: string;
    direction: string;
    stake: number;
    pnl: number;
    win: boolean;
};

type Props = {
    onClose: () => void;
};

export default function FiveTickPattern({ onClose }: Props) {
    const { client } = useStore();
    const { balance, currency } = client;

    const [status, setStatus] = useState<TStatus>('idle');
    const [currentAsset, setCurrentAsset] = useState(ASSETS[0]);
    const [assetIndex, setAssetIndex] = useState(0);
    const [price, setPrice] = useState<number | null>(null);
    const [prevPrice, setPrevPrice] = useState<number | null>(null);
    const [tickHistory, setTickHistory] = useState<string[]>([]);
    const [stake, setStake] = useState(CFG_STAKE);
    const [martLevel, setMartLevel] = useState(0);
    const [stepCount, setStepCount] = useState(0);
    const [sessionPnl, setSessionPnl] = useState(0);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [totalTrades, setTotalTrades] = useState(0);
    const [bestTrade, setBestTrade] = useState(0);
    const [worstTrade, setWorstTrade] = useState(0);
    const [patternsFound, setPatternsFound] = useState(0);
    const [tradesOnAsset, setTradesOnAsset] = useState(0);
    const [log, setLog] = useState<TTradeRow[]>([]);
    const [signal, setSignal] = useState<'CALL' | 'PUT' | null>(null);
    const [isArmed, setIsArmed] = useState(false);
    const [tickLatency, setTickLatency] = useState<number | null>(null);
    const [orderRTT, setOrderRTT] = useState<number | null>(null);
    const [msg, setMsg] = useState<{ text: string; type: string } | null>(null);

    const subRef = useRef<{ unsubscribe: () => void } | null>(null);
    const tickBufRef = useRef<string[]>([]);
    const armedRef = useRef(false);
    const signalRef = useRef<'CALL' | 'PUT' | null>(null);
    const statusRef = useRef<TStatus>('idle');
    const assetIdxRef = useRef(0);
    const curAssetRef = useRef(ASSETS[0]);
    const stakeRef = useRef(CFG_STAKE);
    const martRef = useRef(0);
    const stepRef = useRef(0);
    const contractIdRef = useRef<number | null>(null);
    const execLockedRef = useRef(false);

    const showMsg = useCallback((text: string, type: string) => {
        setMsg({ text, type });
    }, []);

    useEffect(() => {
        let unsub: (() => void) | null = null;

        const setup = () => {
            if (!api_base.api) return;
            const s = api_base.api.onMessage().subscribe(({ data }: any) => {
                if (!data) return;
                switch (data.msg_type) {
                    case 'tick':
                        handleTick(data.tick);
                        break;
                    case 'proposal':
                        handleProposal(data);
                        break;
                    case 'buy':
                        handleBuy(data.buy);
                        break;
                    case 'proposal_open_contract':
                        handleContract(data.proposal_open_contract);
                        break;
                }
            });
            unsub = s.unsubscribe.bind(s);
            subRef.current = s;
        };

        setup();
        return () => {
            unsub?.();
            api_base.api?.send({ forget_all: 'ticks' });
            api_base.api?.send({ forget_all: 'proposal' });
        };
    }, []);

    const subscribeTicks = useCallback((sym: string) => {
        api_base.api?.send({ ticks_history: sym, subscribe: 1, end: 'latest', count: 50, style: 'ticks' });
    }, []);

    const handleTick = useCallback((tick: { symbol: string; quote: number; epoch: number }) => {
        const lat = Date.now() - tick.epoch * 1000;
        setTickLatency(lat);
        setPrevPrice(p => (p !== null ? p : tick.quote));
        setPrice(tick.quote);

        if (statusRef.current !== 'scanning') return;

        const buf = tickBufRef.current;
        const last = buf.length > 0 ? buf[buf.length - 1] : null;
        const dir = last === null ? 'rise' : tick.quote >= last ? 'rise' : 'fall';
        buf.push(dir);
        if (buf.length > TICK_HISTORY_MAX) buf.shift();
        tickBufRef.current = buf;
        setTickHistory([...buf]);

        const L = buf.length;

        // Arm on 4 consecutive
        if (!armedRef.current && !execLockedRef.current && L >= 4) {
            const d = buf[L - 1];
            if (buf[L - 4] === d && buf[L - 3] === d && buf[L - 2] === d && buf[L - 1] === d) {
                const ct = d === 'rise' ? 'PUT' : 'CALL';
                armEntry(ct);
            }
        }

        // Fire on 5th consecutive
        if (L >= 5) {
            const d = buf[L - 1];
            const allSame = buf[L - 5] === d && buf[L - 4] === d && buf[L - 3] === d && buf[L - 2] === d;
            if (allSame && armedRef.current) {
                const ct = d === 'rise' ? 'PUT' : 'CALL';
                if (signalRef.current === ct) {
                    fireEntry();
                } else {
                    disarmEntry();
                }
            } else if (!allSame) {
                disarmEntry();
            }
        }
    }, []);

    const armEntry = useCallback((contractType: 'CALL' | 'PUT') => {
        signalRef.current = contractType;
        armedRef.current = true;
        setIsArmed(true);
        setSignal(contractType);
        showMsg(`ARMED — ${contractType === 'PUT' ? 'FALL' : 'RISE'}`, 'info');
    }, [showMsg]);

    const disarmEntry = useCallback(() => {
        signalRef.current = null;
        armedRef.current = false;
        setIsArmed(false);
        setSignal(null);
    }, []);

    const fireEntry = useCallback(() => {
        if (!signalRef.current || execLockedRef.current) return;
        execLockedRef.current = true;

        const ct = signalRef.current;
        statusRef.current = 'trading';
        setStatus('trading');
        setPatternsFound(p => p + 1);
        tickBufRef.current = [];
        setTickHistory([]);
        disarmEntry();

        api_base.api?.send({
            proposal: 1,
            contract_type: ct,
            symbol: curAssetRef.current,
            duration: 1,
            duration_unit: 't',
            amount: stakeRef.current,
            basis: 'stake',
            currency: 'USD',
        });
    }, [disarmEntry]);

    const handleProposal = useCallback((data: any) => {
        const p = data.proposal;
        if (!p) return;
        const id = p.id;
        const ask = p.ask_price;
        const now = Date.now();

        api_base.api?.send({ buy: id, price: ask });
        setOrderRTT(null);
    }, []);

    const handleBuy = useCallback((buy: any) => {
        contractIdRef.current = buy.contract_id;

        showMsg(`Contract #${buy.contract_id} $${parseFloat(buy.buy_price).toFixed(2)}`, 'info');

        api_base.api?.send({
            proposal_open_contract: 1,
            contract_id: buy.contract_id,
            subscribe: 1,
        });
    }, [showMsg]);

    const handleContract = useCallback((c: TContractUpdate) => {
        if (c.contract_id !== contractIdRef.current) return;
        if (!c.is_expired && !c.is_sold) return;
        contractIdRef.current = null;
        execLockedRef.current = false;

        const pnl = parseFloat(c.profit);
        const cost = parseFloat(c.buy_price);
        const isWin = pnl > 0;

        setSessionPnl(prev => prev + pnl);
        setTotalTrades(t => t + 1);
        setTradesOnAsset(t => t + 1);
        if (isWin) setWins(w => w + 1);
        else setLosses(l => l + 1);
        if (pnl > 0) setBestTrade(b => Math.max(b, pnl));
        if (pnl < 0) setWorstTrade(w => Math.min(w, pnl));

        const row: TTradeRow = {
            time: new Date().toLocaleTimeString(),
            asset: ASSET_NAMES[curAssetRef.current] || curAssetRef.current,
            type: stepRef.current > 0 ? `RETRY L${martRef.current}` : 'PATTERN',
            direction: c.contract_type === 'CALL' ? '▲ RISE' : '▼ FALL',
            stake: cost,
            pnl,
            win: isWin,
        };
        setLog(prev => [row, ...prev]);

        if (isWin) {
            resetBot();
            showMsg(`WIN +$${pnl.toFixed(2)} — Full reset`, 'success');
        } else {
            const newMart = martRef.current + 1;
            const newStake = parseFloat((CFG_STAKE * Math.pow(CFG_MART, newMart)).toFixed(2));
            martRef.current = newMart;
            stepRef.current += 1;
            stakeRef.current = newStake;
            setMartLevel(newMart);
            setStepCount(s => s + 1);
            setStake(newStake);

            if (newMart < CFG_STEPS) {
                showMsg(`LOSS -$${Math.abs(pnl).toFixed(2)} — L${newMart} $${newStake.toFixed(2)}`, 'error');
                statusRef.current = 'scanning';
                setStatus('scanning');
            } else {
                rotateAsset();
            }
        }
    }, [showMsg]);

    const resetBot = useCallback(() => {
        stakeRef.current = CFG_STAKE;
        martRef.current = 0;
        stepRef.current = 0;
        signalRef.current = null;
        armedRef.current = false;
        tickBufRef.current = [];
        statusRef.current = 'scanning';
        setStake(CFG_STAKE);
        setMartLevel(0);
        setStepCount(0);
        setSignal(null);
        setIsArmed(false);
        setTickHistory([]);
        setStatus('scanning');
    }, []);

    const rotateAsset = useCallback(() => {
        const next = (assetIdxRef.current + 1) % ASSETS.length;
        assetIdxRef.current = next;
        curAssetRef.current = ASSETS[next];
        setAssetIndex(next);
        setCurrentAsset(ASSETS[next]);
        setTradesOnAsset(0);

        stakeRef.current = CFG_STAKE;
        martRef.current = 0;
        stepRef.current = 0;
        tickBufRef.current = [];
        armedRef.current = false;
        signalRef.current = null;
        statusRef.current = 'scanning';
        setStake(CFG_STAKE);
        setMartLevel(0);
        setStepCount(0);

        api_base.api?.send({ forget_all: 'ticks' });
        subscribeTicks(ASSETS[next]);

        showMsg(`Rotated to ${ASSET_NAMES[ASSETS[next]]}`, 'warn');
        setStatus('scanning');
    }, [subscribeTicks, showMsg]);

    const startBot = useCallback(() => {
        assetIdxRef.current = 0;
        curAssetRef.current = ASSETS[0];
        stakeRef.current = CFG_STAKE;
        martRef.current = 0;
        stepRef.current = 0;
        tickBufRef.current = [];
        armedRef.current = false;
        signalRef.current = null;
        execLockedRef.current = false;
        contractIdRef.current = null;

        setAssetIndex(0);
        setCurrentAsset(ASSETS[0]);
        setStake(CFG_STAKE);
        setMartLevel(0);
        setStepCount(0);
        setSessionPnl(0);
        setWins(0);
        setLosses(0);
        setTotalTrades(0);
        setPatternsFound(0);
        setTradesOnAsset(0);
        setBestTrade(0);
        setWorstTrade(0);
        setLog([]);
        setSignal(null);
        setIsArmed(false);
        setTickHistory([]);
        setOrderRTT(null);

        statusRef.current = 'scanning';
        setStatus('scanning');
        subscribeTicks(ASSETS[0]);
        showMsg(`Scanning ${ASSET_NAMES[ASSETS[0]]} for pattern…`, 'info');
    }, [subscribeTicks, showMsg]);

    const stopBot = useCallback(() => {
        statusRef.current = 'idle';
        setStatus('idle');
        api_base.api?.send({ forget_all: 'ticks' });
        api_base.api?.send({ forget_all: 'proposal' });
        showMsg('Bot stopped.', 'info');
    }, [showMsg]);

    const wr = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    const isRunning = status !== 'idle';
    const last5 = tickHistory.slice(-5);
    const signalText = !isArmed ? 'WATCHING…' : signal === 'PUT' ? '▼ ARMED — FALL' : '▲ ARMED — RISE';
    const signalCls = !isArmed ? 'tfp-signal--wait' : 'tfp-signal--armed';

    return (
        <div className='tfp'>
            <div className='tfp-header'>
                <div className='tfp-title-row'>
                    <Text as='h2' color='prominent' weight='bold' size='sm'>
                        <Localize i18n_default_text='5-Tick Pattern Bot' />
                    </Text>
                    <button className='tfp-close' onClick={onClose}>✕</button>
                </div>
                <div className='tfp-badges'>
                    {status === 'scanning' && <span className='tfp-badge tfp-badge--scan'>SCANNING</span>}
                    {status === 'trading' && <span className='tfp-badge tfp-badge--trade'>TRADING</span>}
                    {martLevel >= CFG_STEPS && status === 'scanning' && (
                        <span className='tfp-badge tfp-badge--carry'>CARRYING</span>
                    )}
                    {isArmed && <span className='tfp-badge tfp-badge--armed'>ARMED</span>}
                </div>
            </div>

            {msg && <div className={`tfp-msg tfp-msg--${msg.type}`}>{msg.text}</div>}

            <div className='tfp-metrics'>
                <div className='tfp-metric'>
                    <span className='tfp-metric-label'>Balance</span>
                    <span className='tfp-metric-value tfp-metric-value--accent'>
                        ${parseFloat(balance || '0').toFixed(2)}
                    </span>
                    <span className='tfp-metric-sub'>{currency}</span>
                </div>
                <div className='tfp-metric'>
                    <span className='tfp-metric-label'>P&amp;L</span>
                    <span className={`tfp-metric-value ${sessionPnl >= 0 ? 'tfp-metric-value--green' : 'tfp-metric-value--red'}`}>
                        {sessionPnl >= 0 ? '+' : ''}${sessionPnl.toFixed(2)}
                    </span>
                    <span className='tfp-metric-sub'>Session</span>
                </div>
                <div className='tfp-metric'>
                    <span className='tfp-metric-label'>Win Rate</span>
                    <span className='tfp-metric-value'>{wr}%</span>
                    <span className='tfp-metric-sub'>{wins}W / {losses}L</span>
                </div>
                <div className='tfp-metric'>
                    <span className='tfp-metric-label'>Trades</span>
                    <span className='tfp-metric-value tfp-metric-value--blue'>{totalTrades}</span>
                    <span className='tfp-metric-sub'>{patternsFound} patterns</span>
                </div>
            </div>

            <div className='tfp-asset-bar'>
                <span className='tfp-asset-label'>Assets</span>
                <div className='tfp-asset-pills'>
                    {ASSETS.map((a, i) => (
                        <span
                            key={a}
                            className={
                                'tfp-pill' +
                                (i === assetIndex ? ' tfp-pill--active' : '') +
                                (i < assetIndex ? ' tfp-pill--done' : '')
                            }
                        >
                            {ASSET_NAMES[a]}
                        </span>
                    ))}
                </div>
                <span className='tfp-asset-counter'>
                    Mart L{martLevel}/{CFG_STEPS}
                </span>
            </div>

            <div className='tfp-pattern'>
                <span className='tfp-pattern-label'>Pattern</span>
                <div className='tfp-tick-boxes'>
                    {[0, 1, 2, 3, 4].map(i => {
                        const v = last5[i];
                        const cls = !v ? 'slot' : v === 'rise' ? 'rise' : 'fall';
                        const ch = !v ? '—' : v === 'rise' ? '▲' : '▼';
                        return (
                            <span key={i} className={`tfp-tick tfp-tick--${cls}`}>{ch}</span>
                        );
                    })}
                    <span className='tfp-arrow'>→</span>
                    <span className={`tfp-tick ${isArmed ? 'tfp-tick--armed' : 'tfp-tick--slot'}`}>
                        {isArmed ? (signal === 'PUT' ? '▼' : '▲') : '?'}
                    </span>
                </div>
                <div className={`tfp-signal ${signalCls}`}>{signalText}</div>
            </div>

            <div className='tfp-stake-card'>
                <div className='tfp-stake-info'>
                    <Text size='xs' color='less-prominent'>Stake</Text>
                    <Text size='l' weight='bold' color='prominent'>${stake.toFixed(2)}</Text>
                    <Text size='xxs' color='less-prominent'>L{martLevel} / Step {stepCount}/{CFG_STEPS}</Text>
                </div>
                <div className='tfp-stake-info'>
                    <Text size='xs' color='less-prominent'>Asset</Text>
                    <Text size='l' weight='bold' color='accent'>
                        {ASSET_NAMES[currentAsset] || currentAsset}
                    </Text>
                    <Text size='xxs' color='less-prominent'>${price?.toFixed(5) ?? '—'}</Text>
                </div>
                <div className='tfp-stake-info'>
                    <Text size='xs' color='less-prominent'>Latency</Text>
                    <Text size='l' weight='bold' color='prominent'>{tickLatency !== null ? `${tickLatency}ms` : '—'}</Text>
                    <Text size='xxs' color='less-prominent'>RTT: {orderRTT !== null ? `${orderRTT}ms` : '—'}</Text>
                </div>
            </div>

            <div className='tfp-actions'>
                {!isRunning ? (
                    <button className='tfp-btn tfp-btn--start' onClick={startBot}>
                        ▶ Start Bot
                    </button>
                ) : (
                    <button className='tfp-btn tfp-btn--stop' onClick={stopBot}>
                        ■ Stop Bot
                    </button>
                )}
            </div>

            <div className='tfp-log'>
                <div className='tfp-log-header'>
                    <Text size='xs' weight='bold' color='accent'>Trade Log</Text>
                    <Text size='xxs' color='less-prominent'>{log.length} trades</Text>
                </div>
                {log.length === 0 ? (
                    <div className='tfp-log-empty'>No trades yet</div>
                ) : (
                    <div className='tfp-log-rows'>
                        {log.map((r, i) => (
                            <div key={i} className='tfp-log-row'>
                                <span className='tfp-log-time'>{r.time}</span>
                                <span className='tfp-log-asset'>{r.asset}</span>
                                <span className='tfp-log-dir'>{r.direction}</span>
                                <span className='tfp-log-stake'>${r.stake.toFixed(2)}</span>
                                <span className={`tfp-log-pnl ${r.win ? 'tfp-log-pnl--win' : 'tfp-log-pnl--loss'}`}>
                                    {r.pnl >= 0 ? '+' : ''}${r.pnl.toFixed(2)}
                                </span>
                                <span className={`tfp-log-result ${r.win ? 'tfp-log-result--win' : 'tfp-log-result--loss'}`}>
                                    {r.win ? 'WIN' : 'LOSS'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
