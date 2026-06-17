import { Injectable } from '@nestjs/common';
import { StellarService } from '../stellar/stellar.service';
import { stellarConfig } from '../stellar/stellar.config';

@Injectable()
export class RemittanceService {
  constructor(private stellar: StellarService) {}

  async remit(dto: {
    senderKeypair: string;
    destAddress: string;
    sendAsset: { code: string; issuer?: string };
    destAsset: { code: string; issuer?: string };
    amount: string;
  }) {
    // Ensure USDC trustline on sender account before payment
    const usdc = stellarConfig.USDC;
    await this.stellar.ensureTrustline(dto.senderKeypair, usdc.code, usdc.issuer);

    // Find best path via DEX
    const paths = await this.stellar.findPaths(
      dto.sendAsset.code, dto.sendAsset.issuer ?? '',
      dto.destAsset.code, dto.destAsset.issuer ?? '',
      dto.amount,
    );

    const bestPath = paths[0]?.path ?? [];

    return this.stellar.pathPayment({
      senderSecret: dto.senderKeypair,
      destAddress: dto.destAddress,
      sendAsset: dto.sendAsset,
      destAsset: dto.destAsset,
      sendAmount: dto.amount,
      path: bestPath.map((a: any) => ({
        code: a.asset_type === 'native' ? 'XLM' : a.asset_code,
        issuer: a.asset_issuer,
      })),
    });
  }

  async getCorridors() {
    const usdc = stellarConfig.USDC;
    const corridorEntries = Object.entries(stellarConfig.corridors);

    const results = await Promise.all(
      corridorEntries.map(async ([currency, asset]) => {
        const paths = await this.stellar.findPaths(
          usdc.code, usdc.issuer,
          asset.code, asset.issuer,
          '1',
        );
        const pools = await this.stellar.getLiquidityPools(
          usdc.code, usdc.issuer,
          asset.code, asset.issuer,
        );
        return {
          corridor: `USDC→${currency}`,
          sendAsset: { code: usdc.code, issuer: usdc.issuer },
          destAsset: asset,
          bestPaths: paths.slice(0, 3),
          liquidityPools: pools.slice(0, 3),
        };
      }),
    );

    return results;
  }
}
