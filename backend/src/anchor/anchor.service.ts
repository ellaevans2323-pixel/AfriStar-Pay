import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

// In-memory KYC store (replace with DB in production)
const kycStore = new Map<string, any>();
const txStore = new Map<string, any>();

@Injectable()
export class AnchorService {
  /** SEP-12 KYC registration stub */
  register(dto: {
    account: string;
    first_name: string;
    last_name: string;
    email_address: string;
    birth_date: string;
    address: string;
    id_type: 'passport' | 'national_id' | 'drivers_license';
    id_number: string;
    id_expiration?: string;
  }) {
    if (!dto.account || !dto.first_name || !dto.last_name || !dto.email_address) {
      throw new BadRequestException('Missing required KYC fields');
    }
    const id = randomUUID();
    kycStore.set(dto.account, { ...dto, id, status: 'PENDING', created_at: new Date().toISOString() });
    return { id, status: 'PENDING', message: 'KYC submitted for review' };
  }

  /** SEP-6 /deposit */
  deposit(params: {
    asset_code: string;
    account: string;
    amount?: string;
    memo_type?: string;
    memo?: string;
  }) {
    const kyc = kycStore.get(params.account);
    if (!kyc) throw new BadRequestException('Account not KYC registered. Call POST /anchor/register first.');

    const id = randomUUID();
    const record = {
      id,
      kind: 'deposit',
      status: 'pending_user_transfer_start',
      asset_code: params.asset_code,
      account: params.account,
      amount: params.amount,
      memo_type: params.memo_type ?? 'text',
      memo: params.memo ?? id.slice(0, 8).toUpperCase(),
      how: 'Send funds to our bank account using the memo above',
      eta: 1800,
      created_at: new Date().toISOString(),
    };
    txStore.set(id, record);
    return record;
  }

  /** SEP-6 /withdraw */
  withdraw(params: {
    asset_code: string;
    account: string;
    dest: string;
    dest_extra?: string;
    amount?: string;
  }) {
    const kyc = kycStore.get(params.account);
    if (!kyc) throw new BadRequestException('Account not KYC registered. Call POST /anchor/register first.');

    const id = randomUUID();
    const record = {
      id,
      kind: 'withdrawal',
      status: 'pending_user_transfer_start',
      asset_code: params.asset_code,
      account: params.account,
      amount: params.amount,
      dest: params.dest,
      dest_extra: params.dest_extra,
      withdraw_anchor_account: 'GXXXXANCHORACCOUNT',
      withdraw_memo_type: 'text',
      withdraw_memo: id.slice(0, 8).toUpperCase(),
      eta: 3600,
      created_at: new Date().toISOString(),
    };
    txStore.set(id, record);
    return record;
  }

  /** SEP-6 /transaction */
  getTransaction(id: string) {
    const tx = txStore.get(id);
    if (!tx) throw new BadRequestException('Transaction not found');
    return { transaction: tx };
  }
}
