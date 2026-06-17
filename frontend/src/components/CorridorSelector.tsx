'use client';

import { useState, useEffect, useCallback } from 'react';
import { Horizon, Asset, Keypair } from '@stellar/stellar-sdk';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const USDC = { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' };

const CORRIDORS = [
  { label: 'USDC → NGN', code: 'NGNC', issuer: 'GAWODAROMJ33V5YDFY3EFYMV2SUC2TRQN2ZGQT7HNO5JTA46NTKU4GS' },
  { label: 'USDC → GHS', code: 'GHSC', issuer: 'GDSRCV5VTG3CAQTZXE7XZRQ6OJBGBVXJV2XOVHF6GQQTEDMR5MXAQCE' },
  { label: 'USDC → KES', code: 'KESC', issuer: 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG' },
  { label: 'USDC → ZAR', code: 'ZARC', issuer: 'GDVKY2GU2DRXWTBEYJJWSFXIGBZV6AZNBVVSYFWI65VMANTE6ZTBQH6B' },
];

type PathRecord = {
  destination_amount: string;
  path: Array<{ asset_type: string; asset_code?: string }>;
};

type RemitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function CorridorSelector() {
  const [selected, setSelected] = useState(CORRIDORS[0]);
  const [amount, setAmount] = useState('10');
  const [destAddress, setDestAddress] = useState('');
  const [senderSecret, setSenderSecret] = useState('');
  const [paths, setPaths] = useState<PathRecord[]>([]);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [status, setStatus] = useState<RemitStatus>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPaths = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setLoadingPaths(true);
    try {
      const server = new Horizon.Server(HORIZON_URL);
      const sendAsset = new Asset(USDC.code, USDC.issuer);
      const destAsset = new Asset(selected.code, selected.issuer);
      const result = await server
        .strictSendPaths(sendAsset, amount, [destAsset])
        .call();
      setPaths(result.records as PathRecord[]);
    } catch {
      setPaths([]);
    } finally {
      setLoadingPaths(false);
    }
  }, [selected, amount]);

  useEffect(() => {
    fetchPaths();
  }, [fetchPaths]);

  async function handleRemit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/remit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderKeypair: senderSecret,
          destAddress,
          sendAsset: USDC,
          destAsset: { code: selected.code, issuer: selected.issuer },
          amount,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTxHash(data.hash ?? '');
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  const bestRate = paths[0]
    ? `1 USDC ≈ ${(parseFloat(paths[0].destination_amount) / parseFloat(amount)).toFixed(4)} ${selected.code}`
    : null;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-md space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">AfristarPay</h1>
      <p className="text-sm text-gray-500">Zero-fee cross-border remittance via Stellar DEX</p>

      {/* Corridor picker */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Corridor</label>
        <div className="grid grid-cols-2 gap-2">
          {CORRIDORS.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelected(c)}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                selected.code === c.code
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount + live rate */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Send Amount (USDC)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {loadingPaths && <p className="text-xs text-gray-400">Fetching best paths…</p>}
        {!loadingPaths && bestRate && (
          <p className="text-xs text-green-600 font-medium">{bestRate}</p>
        )}
        {!loadingPaths && paths.length === 0 && amount && (
          <p className="text-xs text-red-500">No paths found for this corridor</p>
        )}
      </div>

      {/* Path preview */}
      {paths.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600">Top DEX Paths</p>
          <ul className="space-y-1">
            {paths.slice(0, 3).map((p, i) => (
              <li key={i} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                You receive:{' '}
                <span className="font-semibold text-gray-700">
                  {parseFloat(p.destination_amount).toFixed(4)} {selected.code}
                </span>{' '}
                via {p.path.length ? p.path.map((a) => a.asset_code ?? 'XLM').join(' → ') : 'direct'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Send form */}
      <form onSubmit={handleRemit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Recipient Stellar Address</label>
          <input
            required
            value={destAddress}
            onChange={(e) => setDestAddress(e.target.value)}
            placeholder="G..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Sender Secret Key{' '}
            <span className="text-xs font-normal text-red-500">(testnet only — never use mainnet secret in browser)</span>
          </label>
          <input
            required
            type="password"
            value={senderSecret}
            onChange={(e) => setSenderSecret(e.target.value)}
            placeholder="S..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || paths.length === 0}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {status === 'loading' ? 'Sending…' : `Send ${amount} USDC → ${selected.code}`}
        </button>
      </form>

      {/* Result */}
      {status === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ Transaction submitted!{' '}
          {txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline font-mono text-xs"
            >
              {txHash.slice(0, 16)}…
            </a>
          )}
        </div>
      )}
      {status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ❌ {errorMsg}
        </div>
      )}
    </div>
  );
}
