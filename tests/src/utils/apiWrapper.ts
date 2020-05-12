import { ApiPromise, WsProvider } from '@polkadot/api';
import { Option } from '@polkadot/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { UserInfo, PaidMembershipTerms } from '@joystream/types/lib/members';
import { Balance } from '@polkadot/types/interfaces';
import BN = require('bn.js');
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Sender } from './sender';
import { Utils } from './utils';

export class ApiWrapper {
  private readonly api: ApiPromise;
  private readonly sender: Sender;

  public static async create(provider: WsProvider): Promise<ApiWrapper> {
    const api = await ApiPromise.create({ provider });
    return new ApiWrapper(api);
  }

  constructor(api: ApiPromise) {
    this.api = api;
    this.sender = new Sender(api);
  }

  public close() {
    this.api.disconnect();
  }

  public async buyMembership(
    account: KeyringPair,
    paidTermsId: number,
    name: string,
    expectFailure = false
  ): Promise<void> {
    return this.sender.signAndSend(
      this.api.tx.members.buyMembership(paidTermsId, new UserInfo({ handle: name, avatar_uri: '', about: '' })),
      account,
      expectFailure
    );
  }

  public getMembership(address: string): Promise<any> {
    return this.api.query.members.memberIdsByControllerAccountId(address);
  }

  public getBalance(address: string): Promise<Balance> {
    return this.api.query.balances.freeBalance<Balance>(address);
  }

  public async transferBalance(from: KeyringPair, to: string, amount: BN): Promise<void> {
    return this.sender.signAndSend(this.api.tx.balances.transfer(to, amount), from);
  }

  public getPaidMembershipTerms(paidTermsId: number): Promise<Option<PaidMembershipTerms>> {
    return this.api.query.members.paidMembershipTermsById<Option<PaidMembershipTerms>>(paidTermsId);
  }

  public getMembershipFee(paidTermsId: number): Promise<BN> {
    return this.getPaidMembershipTerms(paidTermsId).then(terms => terms.unwrap().fee.toBn());
  }

  public async transferBalanceToAccounts(from: KeyringPair, to: KeyringPair[], amount: BN): Promise<void[]> {
    return Promise.all(
      to.map(async keyPair => {
        await this.transferBalance(from, keyPair.address, amount);
      })
    );
  }

  private getBaseTxFee(): BN {
    return this.api.createType('BalanceOf', this.api.consts.transactionPayment.transactionBaseFee).toBn();
  }

  private estimateTxFee(tx: SubmittableExtrinsic<'promise'>): BN {
    const baseFee: BN = this.getBaseTxFee();
    const byteFee: BN = this.api.createType('BalanceOf', this.api.consts.transactionPayment.transactionByteFee).toBn();
    return Utils.calcTxLength(tx).mul(byteFee).add(baseFee);
  }

  public estimateBuyMembershipFee(account: KeyringPair, paidTermsId: number, name: string): BN {
    const nonce: BN = new BN(0);
    return this.estimateTxFee(
      this.api.tx.members.buyMembership(paidTermsId, new UserInfo({ handle: name, avatar_uri: '', about: '' }))
    );
  }
}
