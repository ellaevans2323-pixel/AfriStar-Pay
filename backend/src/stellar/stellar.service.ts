import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Horizon,
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { stellarConfig } from './stellar.config';
import axios from 'axios';

@Injectable()
export class StellarService {
  private readonly server: Horizon.Server;
  private readonly networkPassphrase: string;
  private readonly horizonUrl: string;
  private readonly logger = new Logger(StellarService.name);

  constructor(private config: ConfigService) {
    this.horizonUrl = config.get('HORIZON_URL', stellarConfig.testnet.horizonUrl);
    this.networkPassphrase = config.get('NETWORK_PASSPHRASE', Networks.TESTNET);
    this.server = new Horizon.Server(this.horizonUrl);
  }

  private toAsset(code: string, issuer?: string): Asset {
    return code === 'XLM' ? Asset.native() : new Asset(code, issuer!);
  }

  /** Find strict-send paths between two assets */
  async findPaths(sendAssetCode: string, sendAssetIssuer: string, destAssetCode: string, destAssetIssuer: string, sendAmount: string) {
    const sendAsset = this.toAsset(sendAssetCode, sendAssetIssuer);
    const destAsset = this.toAsset(destAssetCode, destAssetIssuer);
    const paths = await this.server
      .strictSendPaths(sendAsset, sendAmount, [destAsset])
      .call();
    return paths.records;
  }

  /** Execute PathPaymentStrictSend */
  async pathPayment(params: {
    senderSecret: string;
    destAddress: string;
    sendAsset: { code: string; issuer?: string };
    destAsset: { code: string; issuer?: string };
    sendAmount: string;
    path?: Array<{ code: string; issuer?: string }>;
  }) {
    const senderKeypair = Keypair.fromSecret(params.senderSecret);
    const account = await this.server.loadAccount(senderKeypair.publicKey());

    const sendAsset = this.toAsset(params.sendAsset.code, params.sendAsset.issuer);
    const destAsset = this.toAsset(params.destAsset.code, params.destAsset.issuer);

    // Apply 0.5% slippage to destMin
    const destMin = (parseFloat(params.sendAmount) * (1 - stellarConfig.slippageTolerance)).toFixed(7);

    const path = (params.path || []).map(a => this.toAsset(a.code, a.issuer));

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset,
          sendAmount: params.sendAmount,
          destination: params.destAddress,
          destAsset,
          destMin,
          path,
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(senderKeypair);
    const result = await this.server.submitTransaction(tx);
    return result;
  }

  /** Ensure trust line exists for an asset on an account */
  async ensureTrustline(accountSecret: string, assetCode: string, assetIssuer: string) {
    const keypair = Keypair.fromSecret(accountSecret);
    const account = await this.server.loadAccount(keypair.publicKey());

    const alreadyTrusted = account.balances.some(
      (b: any) => b.asset_code === assetCode && b.asset_issuer === assetIssuer,
    );
    if (alreadyTrusted) return { status: 'exists' };

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.changeTrust({ asset: new Asset(assetCode, assetIssuer) }))
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    await this.server.submitTransaction(tx);
    return { status: 'created' };
  }

  /** Query liquidity pools for a given asset pair */
  async getLiquidityPools(assetA: string, issuerA: string, assetB: string, issuerB: string) {
    const reserveA = assetA === 'XLM' ? 'native' : `${assetA}:${issuerA}`;
    const reserveB = assetB === 'XLM' ? 'native' : `${assetB}:${issuerB}`;
    const { data } = await axios.get(`${this.horizonUrl}/liquidity_pools`, {
      params: { reserves: `${reserveA},${reserveB}`, limit: 10 },
    });
    return data._embedded?.records ?? [];
  }

  /** Stream transaction status from Horizon event stream */
  streamTransaction(txHash: string, onStatus: (data: any) => void, onError: (err: any) => void) {
    return (this.server.transactions() as any)
      .transaction(txHash)
      .stream({ onmessage: onStatus, onerror: onError });
  }

  getServer() {
    return this.server;
  }
}
