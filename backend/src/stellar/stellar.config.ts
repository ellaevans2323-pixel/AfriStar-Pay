import { Networks } from '@stellar/stellar-sdk';

export const stellarConfig = {
  testnet: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
  },
  mainnet: {
    horizonUrl: 'https://horizon.stellar.org',
    networkPassphrase: Networks.PUBLIC,
  },
  // USDC issued by centre.io
  USDC: {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
  // African stablecoins / anchored assets
  corridors: {
    NGN: { code: 'NGNC', issuer: 'GAWODAROMJ33V5YDFY3EFYMV2SUC2TRQN2ZGQT7HNO5JTA46NTKU4GS' },
    GHS: { code: 'GHSC', issuer: 'GDSRCV5VTG3CAQTZXE7XZRQ6OJBGBVXJV2XOVHF6GQQTEDMR5MXAQCE' },
    KES: { code: 'KESC', issuer: 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG' },
    ZAR: { code: 'ZARC', issuer: 'GDVKY2GU2DRXWTBEYJJWSFXIGBZV6AZNBVVSYFWI65VMANTE6ZTBQH6B' },
  },
  slippageTolerance: 0.005, // 0.5%
};

export type Network = 'testnet' | 'mainnet';

export function getHorizonUrl(network: Network = 'testnet'): string {
  return stellarConfig[network].horizonUrl;
}

export function getNetworkPassphrase(network: Network = 'testnet'): string {
  return stellarConfig[network].networkPassphrase;
}
